(function () {
  const host = location.hostname;
  const port = location.port;
  const renderApi = "https://painelure2-api.onrender.com";
  const localStatic = (host === "localhost" || host === "127.0.0.1") && port !== "4173";
  const useRenderApi = host.endsWith("github.io") || host === "jeffersonf.github.io" || localStatic || location.protocol === "file:";

  window.PAINELURE_API_URL = window.PAINELURE_API_URL || (useRenderApi ? renderApi : "");
})();
