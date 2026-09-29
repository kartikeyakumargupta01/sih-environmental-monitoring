(function () {

  "use strict";


  // ============================================================
  // COMMON.JS
  // Shared authentication + navigation logic
  // ============================================================


  // ============================================================
  // TOKEN HELPERS
  // ============================================================

  function getAccessToken() {

    return localStorage.getItem(
      "access_token"
    );

  }


  function getStoredUser() {

    const userData =
      localStorage.getItem(
        "current_user"
      );


    if (!userData) {

      return null;

    }


    try {

      return JSON.parse(
        userData
      );

    }
    catch (error) {

      console.error(
        "Invalid stored user data:",
        error
      );


      localStorage.removeItem(
        "current_user"
      );


      return null;

    }

  }


  function clearAuthentication() {

    localStorage.removeItem(
      "access_token"
    );


    localStorage.removeItem(
      "current_user"
    );

  }


  // ============================================================
  // REDIRECT TO LOGIN
  // ============================================================

  function redirectToLogin() {

    clearAuthentication();


    window.location.href =
      "login.html";

  }


  // ============================================================
  // CURRENT PAGE
  // ============================================================

  function getCurrentPage() {

    const page =
      window.location.pathname
        .split("/")
        .pop();


    return page || "home.html";

  }


  // ============================================================
  // ACTIVE NAVIGATION
  // ============================================================

  function highlightActiveNavigation() {

    const currentPage =
      getCurrentPage();


    document
      .querySelectorAll(
        ".nav a"
      )
      .forEach(
        function (link) {

          const href =
            link.getAttribute(
              "href"
            );


          if (
            href === currentPage
          ) {

            link.classList.add(
              "active"
            );

          }
          else {

            link.classList.remove(
              "active"
            );

          }

        }
      );

  }


  // ============================================================
  // DISPLAY PROJECT CODE
  // ============================================================

  function displayProjectCode() {

    const projectCode =
      window.APP_CONFIG?.PROJECT_CODE ||
      "SIH 26078";


    document
      .querySelectorAll(
        "[data-project-code]"
      )
      .forEach(
        function (element) {

          element.textContent =
            projectCode;

        }
      );

  }


  // ============================================================
  // DISPLAY LOGGED-IN USER
  // ============================================================

  function displayLoggedInUser() {

    const user =
      getStoredUser();


    if (!user) {

      return;

    }


    document
      .querySelectorAll(
        "[data-user-name]"
      )
      .forEach(
        function (element) {

          element.textContent =
            user.name ||
            "User";

        }
      );


    document
      .querySelectorAll(
        "[data-user-email]"
      )
      .forEach(
        function (element) {

          element.textContent =
            user.email ||
            "";

        }
      );

  }


  // ============================================================
  // LOGOUT
  // ============================================================

  function setupLogout() {

    const logoutButtons =
      document.querySelectorAll(
        "[data-logout]"
      );


    logoutButtons.forEach(
      function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();


            clearAuthentication();


            window.location.href =
              "login.html";

          }
        );

      }
    );

  }


  // ============================================================
  // PREVENT ACCESS AFTER LOGOUT
  // ============================================================

  window.addEventListener(
    "pageshow",
    function () {

      const currentPage =
        getCurrentPage();


      if (
        currentPage !== "login.html" &&
        !getAccessToken()
      ) {

        redirectToLogin();

      }

    }
  );


  // ============================================================
  // INITIALIZE PROTECTED PAGE
  // ============================================================

  function initializeProtectedPage() {

    const currentPage =
      getCurrentPage();


    // Login page does not need protection
    if (
      currentPage === "login.html"
    ) {

      return;

    }


    // No saved JWT
    if (!getAccessToken()) {

      redirectToLogin();

      return;

    }


    // Highlight current navigation page
    highlightActiveNavigation();


    // Show project code
    displayProjectCode();


    // Setup logout button
    setupLogout();


    /*
      Use the user information already saved
      during login.

      IMPORTANT:
      We do NOT call /api/auth/me here anymore.
    */

    displayLoggedInUser();

  }


  // ============================================================
  // START
  // ============================================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      initializeProtectedPage();

    }
  );


})();