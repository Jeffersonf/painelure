(function () {
  const P = window.PainelURE = window.PainelURE || {};
  P.seedData = P.seedData || {};

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function contactId(contact) {
    return `contact-${normalize([contact.name, contact.role, contact.email].filter(Boolean).join("-"))}`;
  }

  function findContact(name, roleHint = "", email = "") {
    const contacts = P.seedData.contacts || [];
    const nameKey = normalize(name);
    const roleKey = normalize(roleHint);
    const emailKey = normalize(email);
    return contacts.find(contact => emailKey && normalize(contact.email) === emailKey && (!roleKey || normalize(contact.role).includes(roleKey)))
      || contacts.find(contact => normalize(contact.name) === nameKey && roleKey && normalize(contact.role).includes(roleKey))
      || contacts.find(contact => normalize(contact.name) === nameKey)
      || null;
  }

  function mapUser(user) {
    const contact = findContact(user.contactName || user.name, user.contactRole || "", user.email || "");
    return {
      ...user,
      username: user.login,
      contactId: contact ? contact.id : "",
      contactSync: contact ? "linked" : "pending",
      credentials: "pending-online",
      legacySource: "PainelURE 1.0"
    };
  }

  P.seedData.contacts = (P.seedData.contacts || []).map(contact => ({
    ...contact,
    id: contact.id || contactId(contact),
    photo: contact.photo || ""
  }));

  function ensureContact(contact) {
    const exists = (P.seedData.contacts || []).find(item =>
      normalize(item.name) === normalize(contact.name) && normalize(item.role) === normalize(contact.role)
    );
    if (exists) return exists;
    const nextContact = {
      id: contactId(contact),
      phone: contact.phone || "",
      email: contact.email || "",
      photo: contact.photo || "",
      ...contact
    };
    P.seedData.contacts.push(nextContact);
    return nextContact;
  }

  [
    { name: "Bruno", role: "CTC", sector: "Tecnologia", email: "itv.setec@educacao.sp.gov.br", phone: "6235" },
    { name: "Danilo", role: "CTC", sector: "Tecnologia", email: "itv.setec@educacao.sp.gov.br", phone: "6235" }
  ].forEach(ensureContact);

  const supervisorUsers = (P.seedData.supervisors || []).map((supervisor, index) => mapUser({
    id: `user-supervisor-${index + 1}`,
    name: supervisor.name,
    login: supervisor.email ? supervisor.email.split("@")[0] : supervisor.name,
    role: "Supervisão",
    contactName: supervisor.name,
    contactRole: "Supervisor Educacional",
    email: supervisor.email,
    supervisorName: supervisor.name,
    active: true
  }));

  P.seedData.users = [
    mapUser({ id: "user-admin-jefferson", name: "Jefferson", login: "Jefferson", role: "Administrador", contactName: "Jefferson Felipe", contactRole: "Chefe de Seção", email: "jefferson.paula@educacao.sp.gov.br", active: true }),
    mapUser({ id: "user-dirigente", name: "Andre", login: "Andre", role: "Gabinete", contactName: "Andre Dias de Oliveira", contactRole: "Dirigente Regional de Ensino", email: "deitv@educacao.sp.gov.br", active: true }),
    mapUser({ id: "user-seintec", name: "Elcio", login: "Elcio", role: "SEINTEC", contactName: "Elcio Renato Bonifacio de Azevedo", contactRole: "Chefe de Serviço", email: "elcio.azevedo@educacao.sp.gov.br", active: true }),
    mapUser({ id: "user-seom-nelio", name: "Nelio", login: "Nelio", role: "SEOM", contactName: "Nelio Celso Fernandes Junior", contactRole: "Chefe de Serviço", email: "nelio.junior@educacao.sp.gov.br", active: true }),
    mapUser({ id: "user-seafin-rodolfo", name: "Rodolfo", login: "Rodolfo", role: "Carros", contactName: "Rodolfo Rodrigues Pereira", contactRole: "Chefe de Servi\u00e7o", email: "rodolfo.pereira@educacao.sp.gov.br", active: true }),
    mapUser({ id: "user-sepes-hector", name: "Hector", login: "Hector", role: "Carros", contactName: "Hector Antunes de Carvalho", contactRole: "Diretor II", email: "hector.carvalho@educacao.sp.gov.br", active: true }),
    mapUser({ id: "user-segre-priscila", name: "Priscila", login: "Priscila", role: "Carros", contactName: "Priscila Aparecida Concei\u00e7\u00e3o Souza", contactRole: "Chefe de Servi\u00e7o", email: "priscila.souza01@educacao.sp.gov.br", active: true }),
    mapUser({ id: "user-ctc", name: "Gustavo", login: "Gustavo", role: "Técnicos CTC", contactName: "Gustavo", contactRole: "CTC", email: "itv.setec@educacao.sp.gov.br", active: true }),
    mapUser({ id: "user-ctc-bruno", name: "Bruno", login: "Bruno", role: "Técnicos CTC", contactName: "Bruno", contactRole: "CTC", active: true }),
    mapUser({ id: "user-ctc-danilo", name: "Danilo", login: "Danilo", role: "Técnicos CTC", contactName: "Danilo", contactRole: "CTC", active: true }),
    ...supervisorUsers
  ];
})();

