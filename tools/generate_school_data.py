from __future__ import annotations

import csv
import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path

from docx import Document


DOWNLOADS_DIR = Path.home() / "Downloads"
OUTPUT_FILE = Path(__file__).resolve().parents[1] / "frontend" / "school-data.js"
CSV_FILE = DOWNLOADS_DIR / "InventarioEquipamentosEscolas.csv"
NETWORK_CSV_FILE = DOWNLOADS_DIR / "IPs e Senhas 2025 (3)(Planilha1).csv"

FILES = [
    ("Turvo.docx", "EE Bairro Turvo dos Almeidas"),
    ("Simpliciano.docx", "PEI EE Simpliciano Campolim de Almeida"),
    ("Ricardo Campolim.docx", "PEI EE Ricardo Campolim de Almeida Neto"),
    ("Silverio.docx", "EE Professor Silverio Monteiro"),
    ("raul checar.docx", "EE Doutor Raul Venturelli"),
    ("Ot*Ferrari*22.docx", "PEI EE Otavio Ferrari"),
    ("padre arlindo.docx", "PEI EE Padre Arlindo Vieira"),
    ("Nicota.docx", "PEI EE Professora Nicota Soares"),
    ("Oscar.docx", "PEI EE Oscar Kurtz Camargo"),
    ("Jose Vasques.docx", "PEI EE Professor Jose Vasques Ferrari"),
    ("Joao Batista*checar*.docx", "PEI EE Professor Joao Baptista do Amaral Vasconcellos"),
    ("Gerson.docx", "EE Professor Gerson de Barros Margarido"),
    ("Jeminiano.docx", "PEI EE Jeminiano David Muzel"),
    ("EE Idal*cio.docx", "PEI EE Idalicio Mendes Lima"),
    ("francelina.docx", "PEI EE Professora Francelina Franco"),
    ("Ferreira.docx", "EE Bairro Ferreira dos Matos"),
    ("Cinira.docx", "PEI EE Professora Cinira Daniel da Silva"),
    ("Defune.docx", "EE Doutor Antonio Deffune"),
    ("Boa vista intervales.docx", "EE Bairro Boa Vista Intervales"),
    ("celia.docx", "PEI EE Professora Celia Vasques Ferrari Duch"),
]

SECTION_MARKERS = {
    "network": ("infraestrutura", "conectividade"),
    "inventory": ("inventario",),
    "monitoring": ("cameras", "dvr"),
    "maintenance": ("manutencao", "defeitos", "observacao", "critica"),
}

NON_EQUIPMENT_EXACT = {
    "ADM",
    "OBS",
    "RISCADO",
    "TOTAL",
    "CHAMADOS",
    "COORDENACAO",
    "SECRETARIA",
    "SALA ACESSA",
}

CSV_SCHOOL_MAP = {
    "EE ANTONIO DEFFUNE": "EE Doutor Antonio Deffune",
    "EE BAIRRO BOA VISTA INTERVALES": "EE Bairro Boa Vista Intervales",
    "EE BAIRRO FERREIRA DOS MATOS": "EE Bairro Ferreira dos Matos",
    "EE FRANCELINA FRANCO": "PEI EE Professora Francelina Franco",
    "EE GERSON DE BARROS": "EE Professor Gerson de Barros Margarido",
    "EE IDALICIO MENDES LIMA": "PEI EE Idalicio Mendes Lima",
    "EE OSCAR KURTZ CAMARGO": "PEI EE Oscar Kurtz Camargo",
    "EE SILVERIO MONTERIO": "EE Professor Silverio Monteiro",
}

NETWORK_SCHOOL_MAP = {
    "ANTONIO DEFFUNE": "EE Doutor Antonio Deffune",
    "CELIA VASQUES FERRARI DUCH": "PEI EE Professora Celia Vasques Ferrari Duch",
    "CINIRA DANIEL DA SILVA": "PEI EE Professora Cinira Daniel da Silva",
    "FERREIRA DOS MATOS": "EE Bairro Ferreira dos Matos",
    "FRANCELINA FRANCO": "PEI EE Professora Francelina Franco",
    "GERSON DE BARROS MARGARIDO": "EE Professor Gerson de Barros Margarido",
    "INTERVALES": "EE Bairro Boa Vista Intervales",
    "JEMINIANO DAVID MUZEL": "PEI EE Jeminiano David Muzel",
    "JOAO BAPTISTA DO AMARAL VASCONCELLOS": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
    "JOSE VASQUES FERRARI": "PEI EE Professor Jose Vasques Ferrari",
    "NICOTA SOARES": "PEI EE Professora Nicota Soares",
    "OSCAR KURTZ CAMARGO": "PEI EE Oscar Kurtz Camargo",
    "OTAVIO FERRARI": "PEI EE Otavio Ferrari",
    "PADRE ARLINDO VIEIRA": "PEI EE Padre Arlindo Vieira",
    "RAUL VENTURELLI": "EE Doutor Raul Venturelli",
    "RICARDO CAMPOLIM DE ALMEIDA NETO": "PEI EE Ricardo Campolim de Almeida Neto",
    "SILVERIO MONTEIRO": "EE Professor Silverio Monteiro",
    "SIMPLICIANO CAMPOLIM DE ALMEIDA": "PEI EE Simpliciano Campolim de Almeida",
    "TURVO DOS ALMEIDAS": "EE Bairro Turvo dos Almeidas",
    "ZULMIRA DE OLIVEIRA": "PEI EE Professora Zulmira de Oliveira",
    "AGROVILA I": "PEI EE Idalicio Mendes Lima",
    "DIRETORIA": "DIRETORIA",
}


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").upper().strip()


def find_file(pattern: str) -> Path:
    matches = list(DOWNLOADS_DIR.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"Arquivo nao encontrado para o padrao: {pattern}")
    return matches[0]


def parse_doc_lines(path: Path) -> list[str]:
    doc = Document(str(path))
    return [paragraph.text.strip() for paragraph in doc.paragraphs if paragraph.text.strip()]


def split_sections(lines: list[str]) -> dict[str, list[str]]:
    sections = {"network": [], "inventory": [], "monitoring": [], "maintenance": [], "meta": []}
    current = "meta"
    for line in lines:
        lowered = normalize_text(line).lower()
        matched = None
        for section, markers in SECTION_MARKERS.items():
            if any(marker in lowered for marker in markers):
                matched = section
                break
        if matched:
            current = matched
            continue
        sections[current].append(line)
    return sections


def infer_status(line: str) -> str:
    lowered = normalize_text(line).lower()
    if any(token in lowered for token in ("defeito", "quebrado", "nao funciona", "destelhada", "trincado", "sem energia")):
        return "defeito"
    if any(token in lowered for token in ("manutencao", "troca", "baixa", "chamado", "problema", "sem internet")):
        return "manutencao"
    return "ok"


def infer_asset_family(name: str, notes: str = "") -> str:
    raw_name = normalize_text(name)
    text = normalize_text(f"{name} {notes}")
    if raw_name == "LENOVO":
        return "Equipamento Lenovo"
    if raw_name == "POSITIVO":
        return "Equipamento Positivo"
    if raw_name == "NETBOOKS":
        return "Netbook"
    if raw_name == "NOTEBOOKS":
        return "Notebook"
    if raw_name == "TABLETS":
        return "Tablet"
    if re.fullmatch(r"\d+\s+APS?", text) or " AP" in text:
        return "Access Point"
    if "NET POSITIVO" in text and ("NOVOS" in text or "VELHOS" in text):
        return "Netbook Positivo"
    if "NETBOOK" in text and "1110" in text:
        return "Netbook Positivo 1110"
    if "NETBOOK" in text and "1210" in text:
        return "Netbook Positivo 1210"
    if "NETBOOK" in text and ("POSITIVO" in text or "CINZA" in text or "PRETO" in text):
        return "Netbook Positivo"
    if "TABLET" in text and "POSITIVO" in text:
        return "Tablet Positivo"
    if "TABLET" in text:
        return "Tablet"
    if "TV" in text:
        return "TV / Monitor"
    if "NOTEBOOK" in text and "MULTILASER" in text and "ULTRA" in text:
        return "Notebook Multilaser Ultra"
    if "NOTEBOOK" in text and "POSITIVO" in text:
        return "Notebook Positivo"
    if "NOTEBOOK" in text:
        return "Notebook"
    if "DESKTOP" in text and "LENOVO" in text:
        return "Desktop Lenovo"
    if "DESKTOP" in text and "POSITIVO" in text:
        return "Desktop Legado Positivo"
    if "PC" in text and "ADM" in text:
        return "PC Administrativo"
    if "PC" in text or "COMPUTADOR" in text:
        return "Desktop"
    if "CARRINHO" in text or "PLATAFORMA DE RECARGA" in text or "PONTOS DE RECARGA" in text or "ESTACOES DE CARREGAMENTO" in text:
        return "Recarga de dispositivos"
    if "CHROMEBOOK" in text:
        return "Chromebook"
    if "MONITOR" in text:
        return "Monitor"
    if "PILHA" in text or "BATERIA" in text:
        return "Bateria / Pilha"
    if "CELULARES DA RECEITA" in text:
        return "Celulares da Receita"
    if "SMARTPHONE" in text:
        return "Smartphone"
    if "EQUIPAMENTO ADQUIRIDO PELA ESCOLA" in text:
        return "Equipamento adquirido pela escola"
    if "EQUIPAMENTO NAO INFORMADO" in text or "SEM MARCA" in text:
        return "Equipamento nao informado"
    return name.strip() or "Equipamento nao informado"


def infer_asset_brand(name: str, notes: str = "") -> str:
    text = normalize_text(f"{name} {notes}")
    if "POSITIVO" in text:
        return "Positivo"
    if "LENOVO" in text:
        return "Lenovo"
    if "MULTILASER" in text:
        return "Multilaser"
    if "SEMP TOSHIBA" in text:
        return "Semp Toshiba"
    if "ITAUTEC" in text:
        return "Itautec"
    if "AP" in text:
        return "Infra de rede"
    return ""


def infer_asset_model(name: str, notes: str = "") -> str:
    text = normalize_text(f"{name} {notes}")
    if "1110" in text:
        return "1110"
    if "1210" in text:
        return "1210"
    if "ULTRA" in text:
        return "Ultra"
    if "LEGADO" in text:
        return "Legado"
    if "NOVOS" in text:
        return "Novos"
    if "VELHOS" in text:
        return "Velhos"
    return ""


def is_equipment_line(name: str) -> bool:
    normalized = normalize_text(name)
    if normalized in NON_EQUIPMENT_EXACT:
        return False
    if re.fullmatch(r"\d+\s+(LENOVO|MULTILASER|SEMP TOSHIBA|ITAUTEC|POSITIVO)", normalized):
        return False
    if re.fullmatch(r"\d+\s+(NETBOOKS?|TABLETS?|PCS?)", normalized):
        return False
    return True


def build_asset_record(*, record_id: str, school: str | None, name: str, status: str, notes: str) -> dict:
    family = infer_asset_family(name, notes)
    return {
        "id": record_id,
        **({"school": school} if school else {}),
        "name": family,
        "canonicalName": family,
        "brand": infer_asset_brand(name, notes),
        "model": infer_asset_model(name, notes),
        "sourceName": name,
        "status": status,
        "notes": notes,
    }


def summarize_sections(sections: dict[str, list[str]]) -> str:
    counts = []
    if sections["network"]:
      counts.append(f"rede {len(sections['network'])} itens")
    if sections["inventory"]:
      counts.append(f"inventario {len(sections['inventory'])} itens")
    if sections["monitoring"]:
      counts.append(f"DVR {len(sections['monitoring'])} itens")
    if sections["maintenance"]:
      counts.append(f"manutencao {len(sections['maintenance'])} itens")
    return " | ".join(counts) if counts else "Leitura importada"


def build_school_import(school: str, source_file: Path, sections: dict[str, list[str]]) -> dict:
    preview_parts = []
    labels = {
        "network": "Rede",
        "inventory": "Inventario",
        "monitoring": "Monitoramento",
        "maintenance": "Manutencao",
    }
    for key in ("network", "inventory", "monitoring", "maintenance"):
        content = sections[key]
        if not content:
            continue
        preview_parts.append(f"[{labels[key]}]")
        preview_parts.extend(content[:10])
    return {
        "id": f"seed-import-{slugify(school)}",
        "school": school,
        "type": "docx",
        "label": source_file.name,
        "filename": source_file.name,
        "importedAt": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "summary": summarize_sections(sections),
        "preview": "\n".join(preview_parts[:60]),
    }


def build_school_assets(school: str, sections: dict[str, list[str]]) -> list[dict]:
    assets = []
    seen = set()
    skip_prefixes = ("computadores", "dispositivos", "administrativo", "pedagogico", "outros", "acessorios")
    for line in sections["inventory"]:
        clean = line.strip().lstrip("•- ").strip()
        normalized = normalize_text(clean).lower()
        if not clean or normalized.startswith(skip_prefixes):
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        name = clean.split(":", 1)[0].strip()
        if not is_equipment_line(name):
            continue
        assets.append(build_asset_record(
            record_id=f"seed-asset-{slugify(school)}-{slugify(name)}",
            school=school,
            name=name,
            status=infer_status(clean),
            notes=clean,
        ))
    return assets


def parse_csv_inventory() -> tuple[list[dict], list[dict], list[dict]]:
    with CSV_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    general_groups: dict[tuple[str, str], list[dict]] = {}
    school_groups: dict[tuple[str, str, str], list[dict]] = {}

    for row in rows:
        raw_school = normalize_text(row.get("Escola") or "")
        school = CSV_SCHOOL_MAP.get(raw_school)
        if not school:
            continue
        equipment = (row.get("Equipamento") or "Equipamento nao informado").strip() or "Equipamento nao informado"
        status = (row.get("Status do Equipamento") or "").strip() or "Sem status"
        school_groups.setdefault((school, equipment, status), []).append(row)
        general_groups.setdefault((equipment, status), []).append(row)

    general_assets = []
    for (equipment, status), items in sorted(general_groups.items(), key=lambda pair: (pair[0][0], pair[0][1])):
        status_norm = normalize_text(status).lower()
        if not is_equipment_line(equipment):
            continue
        asset = build_asset_record(
            record_id=f"seed-general-{slugify(equipment)}-{slugify(status)}",
            school=None,
            name=equipment,
            status="ok" if status_norm == "funcionando" else ("manutencao" if status_norm in {"manutencao", "garantia"} else "defeito"),
            notes=f"{len(items)} registro(s) no CSV | status original: {status}",
        )
        asset["place"] = "Inventario geral da regional"
        general_assets.append(asset)

    school_assets = []
    school_imports = []
    school_index: dict[str, list[dict]] = {}
    for (school, equipment, status), items in sorted(school_groups.items(), key=lambda pair: (pair[0][0], pair[0][1], pair[0][2])):
        status_norm = normalize_text(status).lower()
        merged_status = "ok" if status_norm == "funcionando" else ("manutencao" if status_norm in {"manutencao", "garantia"} else "defeito")
        blue_count = sum(1 for item in items if normalize_text(item.get("BlueMonitor") or "").lower() == "SIM".lower())
        if not is_equipment_line(equipment):
            continue
        school_assets.append(build_asset_record(
            record_id=f"seed-csv-{slugify(school)}-{slugify(equipment)}-{slugify(status)}",
            school=school,
            name=equipment,
            status=merged_status,
            notes=f"{len(items)} unidade(s) | status original: {status} | BlueMonitor: {blue_count}",
        ))
        school_index.setdefault(school, []).append({
            "equipment": infer_asset_family(equipment, status),
            "status": status,
            "count": len(items),
        })

    for school, items in sorted(school_index.items()):
        preview_lines = [f"{item['equipment']}: {item['count']} ({item['status']})" for item in items[:12]]
        school_imports.append({
            "id": f"seed-import-csv-{slugify(school)}",
            "school": school,
            "type": "csv",
            "label": "InventarioEquipamentosEscolas.csv",
            "filename": "InventarioEquipamentosEscolas.csv",
            "importedAt": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "summary": f"{sum(item['count'] for item in items)} registro(s) do inventario CSV",
            "preview": "\n".join(preview_lines),
        })

    return general_assets, school_assets, school_imports


def read_csv_rows(path: Path, delimiter: str = ",") -> list[dict]:
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            with path.open("r", encoding=encoding, newline="") as handle:
                return list(csv.DictReader(handle, delimiter=delimiter))
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError("csv", b"", 0, 1, f"Nao foi possivel ler {path.name} com os encodings suportados.")


def clean_network_field(value: str) -> str:
    return (value or "").strip().strip("*")


def extract_camera_numbers(installed: str, working: str) -> tuple[int | None, int | None]:
    installed_nums = [int(value) for value in re.findall(r"\d+", installed or "")]
    working_nums = [int(value) for value in re.findall(r"\d+", working or "")]
    installed_total = sum(installed_nums) if installed_nums else None
    working_total = sum(working_nums) if working_nums else None
    if installed_total is None and working_total is not None:
        installed_total = working_total
    return installed_total, working_total


def infer_network_status(row: dict) -> tuple[str, list[str], int | None, int | None]:
    installed_text = row.get("Quantidade de câmeras instaladas", "") or ""
    working_text = row.get("Quantidade de câmeras funcionando", "") or ""
    installed, working = extract_camera_numbers(installed_text, working_text)
    notes = []
    combined = " ".join(str(value or "") for value in row.values()).lower()
    if installed is not None and working is not None and working < installed:
        notes.append(f"{working}/{installed} camera(s) em funcionamento")
    if not clean_network_field(row.get("DATA Espelhamento", "")):
        notes.append("espelhamento sem data registrada")
    if any(token in combined for token in ("nao deu p testar", "romperam", "sem internet", "sem hd", "destelhada", "sem energia")):
        notes.append("ha observacoes de falha no CFTV ou rede")
    wifi = clean_network_field(row.get("WIFI", ""))
    if wifi:
        notes.append(f"wifi: {wifi}")
    status = "ok"
    if notes:
        status = "manutencao"
    if any(token in combined for token in ("romperam", "sem hd", "destelhada", "sem energia")):
        status = "defeito"
    return status, notes, installed, working


def build_network_preview(row: dict, school_name: str, status_notes: list[str], installed: int | None, working: int | None) -> str:
    preview_lines = []
    for label, value in (
        ("Escola", school_name),
        ("CIE", clean_network_field(row.get("CODIGO CIE ", ""))),
        ("Cameras instaladas", clean_network_field(row.get("Quantidade de câmeras instaladas", "")) or (str(installed) if installed is not None else "")),
        ("Cameras funcionando", clean_network_field(row.get("Quantidade de câmeras funcionando", "")) or (str(working) if working is not None else "")),
        ("Espelhamento", clean_network_field(row.get("DATA Espelhamento", ""))),
        ("Tecnicos", clean_network_field(row.get("Técnicos / Análista:", ""))),
        ("Usuario DVR", clean_network_field(row.get("Usuário DVR", ""))),
        ("Senha", clean_network_field(row.get("SENHA", ""))),
        ("Marca DVR", clean_network_field(row.get("MARCA DVR", ""))),
        ("Rede ADM", clean_network_field(row.get("REDE ADM", ""))),
        ("Gateway ADM", clean_network_field(row.get("GATEWAY ADM", ""))),
        ("Mascara ADM", clean_network_field(row.get("MASCARA ADM", ""))),
        ("VIDEO-DVR1", clean_network_field(row.get("VIDEO-DVR1", ""))),
        ("VIDEO-DVR2", clean_network_field(row.get("VIDEO-DVR2", ""))),
        ("VIDEO-ALARME", clean_network_field(row.get("VIDEO-ALARME", ""))),
        ("VIDEO-DVR3", clean_network_field(row.get("VIDEO-DVR3 (Oficial_SEE)", ""))),
        ("Rede PED", clean_network_field(row.get("REDE PED", ""))),
        ("Gateway PED", clean_network_field(row.get("GATEWAY PED", ""))),
        ("Mascara PED", clean_network_field(row.get("MASCARA PED", ""))),
        ("DNS 1", clean_network_field(row.get("DNS PRIMARIO ", ""))),
        ("DNS 2", clean_network_field(row.get("DNS-SECUNDARIO", ""))),
        ("Banda", clean_network_field(row.get("BANDA LARGA INTRAGOV", ""))),
        ("Firewall", clean_network_field(row.get("FW_MODELO", ""))),
        ("Wi-Fi", clean_network_field(row.get("WIFI", ""))),
    ):
        if value:
            preview_lines.append(f"{label}: {value}")
    preview_lines.extend(status_notes)
    return "\n".join(preview_lines[:26])


def parse_network_csv() -> tuple[list[dict], list[dict]]:
    if not NETWORK_CSV_FILE.exists():
        return [], []

    rows = read_csv_rows(NETWORK_CSV_FILE, delimiter=";")

    network_records = []
    network_imports = []
    for row in rows:
        raw_school = clean_network_field(row.get("ESCOLA ESTADUAL", ""))
        if not raw_school:
            continue
        school = NETWORK_SCHOOL_MAP.get(normalize_text(raw_school), raw_school)
        status, notes, installed, working = infer_network_status(row)
        network_records.append({
            "id": f"seed-network-{slugify(school)}",
            "school": school,
            "de": clean_network_field(row.get("DE", "")),
            "cie": clean_network_field(row.get("CODIGO CIE ", "")),
            "status": status,
            "cameraInstalled": installed,
            "cameraWorking": working,
            "cameraInstalledLabel": clean_network_field(row.get("Quantidade de câmeras instaladas", "")),
            "cameraWorkingLabel": clean_network_field(row.get("Quantidade de câmeras funcionando", "")),
            "mirroringDate": clean_network_field(row.get("DATA Espelhamento", "")),
            "technicians": clean_network_field(row.get("Técnicos / Análista:", "")),
            "dvrUser": clean_network_field(row.get("Usuário DVR", "")),
            "password": clean_network_field(row.get("SENHA", "")),
            "dvrBrand": clean_network_field(row.get("MARCA DVR", "")),
            "adminNetwork": clean_network_field(row.get("REDE ADM", "")),
            "adminGateway": clean_network_field(row.get("GATEWAY ADM", "")),
            "adminMask": clean_network_field(row.get("MASCARA ADM", "")),
            "videoDvr1": clean_network_field(row.get("VIDEO-DVR1", "")),
            "videoDvr2": clean_network_field(row.get("VIDEO-DVR2", "")),
            "videoAlarm": clean_network_field(row.get("VIDEO-ALARME", "")),
            "videoDvr3": clean_network_field(row.get("VIDEO-DVR3 (Oficial_SEE)", "")),
            "pedNetwork": clean_network_field(row.get("REDE PED", "")),
            "pedGateway": clean_network_field(row.get("GATEWAY PED", "")),
            "pedMask": clean_network_field(row.get("MASCARA PED", "")),
            "pedVideoDvr1": clean_network_field(row.get("PED -VIDEO-DVR1", "")),
            "pedVideoDvr2": clean_network_field(row.get("PED -VIDEO-DVR2", "")),
            "pedVideoDvr3": clean_network_field(row.get("PED -VIDEO-DVR3", "")),
            "pedVideoAlarm": clean_network_field(row.get("PED -VIDEO-ALARME", "")),
            "dnsPrimary": clean_network_field(row.get("DNS PRIMARIO ", "")),
            "dnsSecondary": clean_network_field(row.get("DNS-SECUNDARIO", "")),
            "bandwidth": clean_network_field(row.get("BANDA LARGA INTRAGOV", "")),
            "firewallModel": clean_network_field(row.get("FW_MODELO", "")),
            "wifi": clean_network_field(row.get("WIFI", "")),
            "notes": notes,
        })
        network_imports.append({
            "id": f"seed-import-network-{slugify(school)}",
            "school": school,
            "type": "csv-network",
            "label": NETWORK_CSV_FILE.name,
            "filename": NETWORK_CSV_FILE.name,
            "importedAt": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "summary": "CFTV e rede importados com IPs, DVR, DNS, banda e Wi-Fi",
            "preview": build_network_preview(row, school, notes, installed, working),
        })

    return network_records, network_imports


def main() -> None:
    school_imports = []
    school_assets = []
    for pattern, school in FILES:
        path = find_file(pattern)
        lines = parse_doc_lines(path)
        sections = split_sections(lines)
        school_imports.append(build_school_import(school, path, sections))
        school_assets.extend(build_school_assets(school, sections))

    general_assets, csv_school_assets, csv_school_imports = parse_csv_inventory()
    network_records, network_imports = parse_network_csv()
    school_assets.extend(csv_school_assets)
    school_imports.extend(csv_school_imports)
    school_imports.extend(network_imports)

    payload = {
        "generatedAt": datetime.now().isoformat(),
        "generalAssets": general_assets,
        "schoolImports": school_imports,
        "schoolAssets": school_assets,
        "schoolNetworks": network_records,
    }
    OUTPUT_FILE.write_text(
        "window.SETECHUB_SCHOOL_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Arquivo gerado em {OUTPUT_FILE}")
    print(
        f"Importacoes: {len(school_imports)} | "
        f"Equipamentos por escola: {len(school_assets)} | "
        f"Ativos gerais: {len(general_assets)} | "
        f"Redes/CFTV: {len(network_records)}"
    )


if __name__ == "__main__":
    main()
