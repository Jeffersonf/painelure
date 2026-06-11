(function () {
  const P = window.PainelURE;
  const USER_KEY = "painelure2_user";
  const ONLINE_USER_KEY = "painelure2_online_user";

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function initials(name) {
    return String(name || "U")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase() || "U";
  }

  function firstName(name) {
    return String(name || "Usuário").trim().split(/\s+/).filter(Boolean)[0] || "Usuário";
  }

  function users() {
    return P.getAppData?.().users || [];
  }

  function contacts() {
    return P.getAppData?.().contacts || [];
  }

  function contactById(id) {
    return contacts().find(contact => contact.id === id) || null;
  }

  function contactForUser(user) {
    if (!user) return null;
    return contactById(user.contactId)
      || contacts().find(contact => normalize(contact.email) && normalize(contact.email) === normalize(user.email))
      || contacts().find(contact => normalize(contact.name) === normalize(user.contactName || user.name))
      || null;
  }

  function activeUser() {
    const list = users();
    const activeId = localStorage.getItem(USER_KEY);
    return list.find(user => user.id === activeId && user.active !== false)
      || list.find(user => user.role === "Administrador" && user.active !== false)
      || list[0]
      || null;
  }

  function setActiveUser(id) {
    const user = users().find(item => item.id === id);
    if (!user) return null;
    localStorage.setItem(USER_KEY, user.id);
    return user;
  }

  function onlineUser() {
    try {
      localStorage.removeItem(ONLINE_USER_KEY);
      return JSON.parse(sessionStorage.getItem(ONLINE_USER_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function setOnlineUser(user) {
    if (!user) return null;
    sessionStorage.setItem(ONLINE_USER_KEY, JSON.stringify(user));
    return user;
  }

  function clearOnlineUser() {
    localStorage.removeItem(ONLINE_USER_KEY);
    sessionStorage.removeItem(ONLINE_USER_KEY);
  }

  function displayUser(user = activeUser()) {
    const selectedUser = arguments.length ? user : onlineUser() || user;
    user = selectedUser;
    const contact = contactForUser(user);
    return {
      id: user?.id || "",
      name: contact?.name || user?.name || "Usuário",
      shortName: firstName(user?.name || contact?.name || "Usuário"),
      role: user?.role || "Consulta",
      login: user?.login || user?.username || "",
      contactId: contact?.id || user?.contactId || "",
      contactRole: contact?.role || "",
      sector: contact?.sector || "",
      email: contact?.email || user?.email || "",
      phone: contact?.phone || contact?.ramal || "",
      photo: contact?.photo || user?.avatar || "",
      linked: Boolean(contact)
    };
  }

  function updateLinkedContactPhoto(userId, photo) {
    const data = P.getAppData();
    const user = users().find(item => item.id === userId) || onlineUser();
    const contact = contactForUser(user);
    if (!contact) return null;
    const contactsNext = data.contacts.map(item => item.id === contact.id ? { ...item, photo } : item);
    const usersNext = data.users.map(item => item.id === user.id ? { ...item, avatar: photo } : item);
    P.setAppData({ ...data, contacts: contactsNext, users: usersNext });
    P.saveAppData?.();
    return { ...contact, photo };
  }

  P.USER_KEY = USER_KEY;
  P.userInitials = initials;
  P.firstName = firstName;
  P.users = users;
  P.activeUser = activeUser;
  P.setActiveUser = setActiveUser;
  P.onlineUser = onlineUser;
  P.setOnlineUser = setOnlineUser;
  P.clearOnlineUser = clearOnlineUser;
  P.displayUser = displayUser;
  P.contactForUser = contactForUser;
  P.updateLinkedContactPhoto = updateLinkedContactPhoto;
})();
