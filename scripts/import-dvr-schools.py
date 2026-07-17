from __future__ import annotations

import argparse
import json
import re
import shutil
import unicodedata
from datetime import datetime
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DETAILS = Path(r"C:\Users\jeffe\Downloads\IPs e Senhas 2026.xlsx")
DEFAULT_OFFICIAL = Path(r"C:\Users\jeffe\Downloads\ITAPEVA.xlsx")
DEFAULT_STORE = ROOT / "server" / "storage" / "app-data.json"


def text(value):
    if value is None:
        return ""
    return str(value).strip()


def cie(value):
    digits = re.sub(r"\D", "", text(value))
    return digits.lstrip("0") or "0"


def key(value):
    normalized = unicodedata.normalize("NFKD", text(value))
    return re.sub(r"[^a-z0-9]+", "", normalized.encode("ascii", "ignore").decode().lower())


def rows_by_header(path):
    worksheet = openpyxl.load_workbook(path, data_only=True, read_only=True).active
    rows = worksheet.iter_rows(values_only=True)
    headers = [text(value) for value in next(rows)]
    return [dict(zip(headers, row)) for row in rows if any(value is not None for value in row)]


def value(row, *aliases):
    indexed = {key(name): cell for name, cell in row.items()}
    for alias in aliases:
        found = text(indexed.get(key(alias)))
        if found:
            return found
    return ""


def labeled(label, found):
    return f"{label}: {found}" if found else ""


def compact(*items):
    return [item for item in items if item]


def official_by_cie(path):
    result = {}
    for row in rows_by_header(path):
        code = cie(value(row, "CODCIE"))
        result[code] = {
            "adm_dvr1": value(row, "VIDEO-DVR1"),
            "adm_dvr2": value(row, "VIDEO-DVR2"),
            "adm_dvr3": value(row, "VIDEO-DVR3-Oficial_SEE"),
            "adm_alarm": value(row, "VIDEO-ALARME"),
            "ure_access": value(row, "ACESSO URE"),
            "ped_dvr1": value(row, "PED -VIDEO-DVR1"),
            "ped_dvr2": value(row, "PED -VIDEO-DVR2"),
            "ped_dvr3": value(row, "PED -VIDEO-DVR3"),
            "ped_alarm": value(row, "PED -VIDEO-ALARME"),
        }
    return result


def build_record(row, official):
    installed = value(row, "Quantidade de câmeras instaladas")
    working = value(row, "Quantidade de câmeras funcionando")
    mirrored = value(row, "Data do Espelhamento")
    technicians = value(row, "Técnicos / Análista:")
    user = value(row, "Usuário DVR")
    password = value(row, "SENHA")
    brand = value(row, "MARCA DVR")

    return {
        "network": compact(
            labeled("Rede administrativa", value(row, "REDE ADM")),
            labeled("Gateway ADM", value(row, "GATEWAY ADM")),
            labeled("Máscara ADM", value(row, "MASCARA ADM")),
            labeled("Rede pedagógica", value(row, "REDE PED")),
            labeled("Gateway PED", value(row, "GATEWAY PED")),
            labeled("Máscara PED", value(row, "MASCARA PED")),
        ),
        "ips": compact(
            labeled("CIE", value(row, "CODIGO CIE")),
            labeled("VIDEO-DVR1", official.get("adm_dvr1") or value(row, "VIDEO-DVR1")),
            labeled("VIDEO-DVR2", official.get("adm_dvr2") or value(row, "VIDEO-DVR2")),
            labeled("VIDEO-DVR3", official.get("adm_dvr3") or value(row, "VIDEO-DVR3 (Oficial_SEE)")),
            labeled("VIDEO-ALARME", official.get("adm_alarm") or value(row, "VIDEO-ALARME")),
            labeled("Acesso URE", official.get("ure_access")),
            labeled("PED VIDEO-DVR1", official.get("ped_dvr1") or value(row, "PED -VIDEO-DVR1")),
            labeled("PED VIDEO-DVR2", official.get("ped_dvr2") or value(row, "PED -VIDEO-DVR2")),
            labeled("PED VIDEO-DVR3", official.get("ped_dvr3") or value(row, "PED -VIDEO-DVR3")),
            labeled("PED VIDEO-ALARME", official.get("ped_alarm") or value(row, "PED -VIDEO-ALARME")),
            labeled("DNS primário", value(row, "DNS PRIMARIO")),
            labeled("DNS secundário", value(row, "DNS-SECUNDARIO")),
        ),
        "cameras": compact(
            labeled("Instaladas / situação", installed),
            labeled("Funcionando", working),
            labeled("Último espelhamento", mirrored),
            labeled("Técnicos / analistas", technicians),
        ),
        "credentials": compact(
            labeled("Usuário DVR", user),
            labeled("Senha DVR", password),
            labeled("Marca / observação DVR", brand),
        ),
    }


def main():
    parser = argparse.ArgumentParser(description="Atualiza os DVRs das escolas no armazenamento local do PainelURE.")
    parser.add_argument("--details", type=Path, default=DEFAULT_DETAILS)
    parser.add_argument("--official", type=Path, default=DEFAULT_OFFICIAL)
    parser.add_argument("--store", type=Path, default=DEFAULT_STORE)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    payload = json.loads(args.store.read_text(encoding="utf-8"))
    app_data = payload["appData"]
    network_data = app_data.setdefault("networkData", {})

    name_by_cie = {}
    for school_name, current in network_data.items():
        for item in current.get("ips", []):
            if key(item).startswith("cie"):
                name_by_cie[cie(item)] = school_name

    official = official_by_cie(args.official)
    updates = {}
    unmatched = []
    for row in rows_by_header(args.details):
        source_school = value(row, "ESCOLA ESTADUAL")
        if source_school.upper() == "DIRETORIA":
            continue
        code = cie(value(row, "CODIGO CIE"))
        school_name = name_by_cie.get(code)
        if not school_name:
            unmatched.append({"cie": code, "school": source_school})
            continue
        updates[school_name] = build_record(row, official.get(code, {}))

    missing_official = sorted(name for name, record in updates.items() if not any("Acesso URE:" in item for item in record["ips"]))
    if unmatched or missing_official or len(updates) != 21:
        raise SystemExit(json.dumps({
            "error": "Conferência de correspondência falhou",
            "matched": len(updates),
            "unmatched": unmatched,
            "missingOfficial": missing_official,
        }, ensure_ascii=False, indent=2))

    for school_name, record in updates.items():
        network_data[school_name] = {**network_data.get(school_name, {}), **record}

    payload["source"] = "import:dvr-schools"
    payload["updatedAt"] = datetime.now().astimezone().isoformat(timespec="seconds")

    report = {
        "matched": len(updates),
        "updated": sorted(updates),
        "store": str(args.store),
        "dryRun": args.dry_run,
    }
    if not args.dry_run:
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = args.store.with_name(f"{args.store.stem}.before-dvr-{timestamp}{args.store.suffix}")
        shutil.copy2(args.store, backup)
        args.store.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        report["backup"] = str(backup)

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
