(function () {

  "use strict";


  // ============================================================
  // BACKEND URL
  // ============================================================

  // Local variable inside this file only.
  // This will NOT conflict with API_BASE_URL in common.js.

  const API_URL =
    window.APP_CONFIG?.API_BASE_URL ||
    "http://127.0.0.1:8000";


  // ============================================================
  // AUTHENTICATED REQUEST
  // ============================================================

  async function authenticatedFetch(
    url,
    options = {}
  ) {

    const token =
      localStorage.getItem(
        "access_token"
      );


    if (!token) {

      window.location.href =
        "login.html";

      throw new Error(
        "Authentication required"
      );
    }


    const headers = {
      ...(options.headers || {}),

      Authorization:
        `Bearer ${token}`
    };


    const response =
      await fetch(
        url,
        {
          ...options,
          headers
        }
      );


    // Token expired or invalid
    if (
      response.status === 401 ||
      response.status === 403
    ) {

      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "current_user"
      );


      window.location.href =
        "login.html";


      throw new Error(
        "Session expired"
      );
    }


    return response;
  }


  // Make available to other JS files if needed
  window.authenticatedFetch =
    authenticatedFetch;


  // ============================================================
  // DASHBOARD SUMMARY
  // ============================================================

  window.getDashboardSummary =
    async function () {

      const response =
        await authenticatedFetch(
          `${API_URL}/api/dashboard/summary`
        );


      if (!response.ok) {

        throw new Error(
          `Dashboard request failed: ${response.status}`
        );
      }


      return await response.json();
    };


  // ============================================================
  // LATEST SENSOR READING
  // ============================================================

  window.getLatestReading =
    async function (nodeId) {

      const response =
        await authenticatedFetch(
          `${API_URL}/api/readings/latest/${nodeId}`
        );


      if (!response.ok) {

        throw new Error(
          `Latest reading request failed: ${response.status}`
        );
      }


      return await response.json();
    };


  // ============================================================
  // SENSOR HISTORY
  // ============================================================

  window.getNodeHistory =
    async function (
      nodeId,
      limit = 20
    ) {

      const response =
        await authenticatedFetch(
          `${API_URL}/api/readings/${nodeId}?limit=${limit}`
        );


      if (!response.ok) {

        throw new Error(
          `History request failed: ${response.status}`
        );
      }


      return await response.json();
    };


  // ============================================================
  // ALERTS
  // ============================================================

  window.getAlerts =
    async function (
      limit = 20
    ) {

      const response =
        await authenticatedFetch(
          `${API_URL}/api/alerts?limit=${limit}`
        );


      if (!response.ok) {

        throw new Error(
          `Alerts request failed: ${response.status}`
        );
      }


      return await response.json();
    };


})();