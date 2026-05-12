(function () {
  const host = location.hostname;
  const renderApi = "https://painelure2-api.onrender.com";
  const useRenderApi = host.endsWith("github.io") || host === "jeffersonf.github.io";

  window.PAINELURE_API_URL = window.PAINELURE_API_URL || (useRenderApi ? renderApi : "");
})();
