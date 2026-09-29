(function () {

  "use strict";


  // ============================================================
  // CONFIGURATION
  // ============================================================

  const API_URL =
    window.APP_CONFIG?.API_BASE_URL ||
    "http://127.0.0.1:8000";


  // ============================================================
  // ELEMENTS
  // ============================================================

  const card =
    document.getElementById(
      "loginCard"
    );


  const loginForm =
    document.getElementById(
      "loginForm"
    );


  const registerForm =
    document.getElementById(
      "registerForm"
    );


  const emailInput =
    document.getElementById(
      "email"
    );


  const passwordInput =
    document.getElementById(
      "password"
    );


  const togglePassword =
    document.getElementById(
      "togglePassword"
    );


  const loginMessage =
    document.getElementById(
      "loginMessage"
    );


  const loginButton =
    document.getElementById(
      "loginButton"
    );


  const registerName =
    document.getElementById(
      "registerName"
    );


  const registerEmail =
    document.getElementById(
      "registerEmail"
    );


  const registerPassword =
    document.getElementById(
      "registerPassword"
    );


  const registerConfirmPassword =
    document.getElementById(
      "registerConfirmPassword"
    );


  const registerMessage =
    document.getElementById(
      "registerMessage"
    );


  const registerButton =
    document.getElementById(
      "registerButton"
    );


  const forgotPassword =
    document.getElementById(
      "forgotPassword"
    );


  // ============================================================
  // STATE
  // ============================================================

  let loginSubmitting =
    false;


  let registerSubmitting =
    false;


  // ============================================================
  // STORAGE
  // ============================================================

  function saveAuthentication(
    token,
    user
  ) {

    localStorage.setItem(
      "access_token",
      token
    );


    if (user) {

      localStorage.setItem(
        "current_user",
        JSON.stringify(user)
      );

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
  // MESSAGE HELPER
  // ============================================================

  function showMessage(
    element,
    text,
    type = ""
  ) {

    if (!element) {

      return;

    }


    element.textContent =
      text;


    element.className =
      "login-message";


    if (type) {

      element.classList.add(
        type
      );

    }

  }


  // ============================================================
  // INLINE FIELD ERROR
  // ============================================================

  function setFieldError(
    input,
    errorId,
    message
  ) {

    const errorElement =
      document.getElementById(
        errorId
      );


    if (errorElement) {

      errorElement.textContent =
        message;

    }


    const row =
      input?.closest(
        ".input-row"
      );


    if (row) {

      row.classList.toggle(
        "invalid",
        Boolean(message)
      );

    }

  }


  function clearLoginErrors() {

    setFieldError(
      emailInput,
      "emailError",
      ""
    );


    setFieldError(
      passwordInput,
      "passwordError",
      ""
    );

  }


  function clearRegisterErrors() {

    setFieldError(
      registerName,
      "registerNameError",
      ""
    );


    setFieldError(
      registerEmail,
      "registerEmailError",
      ""
    );


    setFieldError(
      registerPassword,
      "registerPasswordError",
      ""
    );


    setFieldError(
      registerConfirmPassword,
      "registerConfirmError",
      ""
    );

  }


  // ============================================================
  // EMAIL VALIDATION
  // ============================================================

  function isValidEmail(
    email
  ) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(
        email
      );

  }


  // ============================================================
  // LOADING BUTTON
  // ============================================================

  function setButtonLoading(
    button,
    loading
  ) {

    if (!button) {

      return;

    }


    button.disabled =
      loading;


    button.classList.toggle(
      "loading",
      loading
    );

  }


  // ============================================================
  // RESPONSE PARSER
  // ============================================================

  async function parseResponse(
    response
  ) {

    const text =
      await response.text();


    if (!text) {

      return {};

    }


    try {

      return JSON.parse(
        text
      );

    }
    catch (error) {

      console.error(
        "Invalid backend response:",
        text
      );


      throw new Error(
        "The server returned an invalid response."
      );

    }

  }


  // ============================================================
  // LOGIN API
  // ============================================================

  async function loginUser(
    email,
    password
  ) {

    let response;


    try {

      response =
        await fetch(
          `${API_URL}/api/auth/login`,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(
                {
                  email,
                  password
                }
              )

          }
        );

    }
    catch (error) {

      throw new Error(
        "Unable to connect to the authentication server."
      );

    }


    const data =
      await parseResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data.detail ||
        "Invalid email or password."
      );

    }


    if (
      !data.access_token
    ) {

      throw new Error(
        "Authentication token was not received."
      );

    }


    return data;

  }


  // ============================================================
  // REGISTER API
  // ============================================================

  async function registerUser(
    name,
    email,
    password
  ) {

    let response;


    try {

      response =
        await fetch(
          `${API_URL}/api/auth/register`,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(
                {
                  name,
                  email,
                  password
                }
              )

          }
        );

    }
    catch (error) {

      throw new Error(
        "Unable to connect to the registration server."
      );

    }


    const data =
      await parseResponse(
        response
      );


    if (!response.ok) {

      throw new Error(
        data.detail ||
        "Registration could not be completed."
      );

    }


    return data;

  }


  // ============================================================
  // EXISTING SESSION CHECK
  // ============================================================

  async function verifyExistingToken() {

    const token =
      localStorage.getItem(
        "access_token"
      );


    if (!token) {

      return;

    }


    try {

      const response =
        await fetch(
          `${API_URL}/api/auth/me`,
          {

            headers: {

              Authorization:
                `Bearer ${token}`

            }

          }
        );


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        clearAuthentication();

        return;

      }


      if (!response.ok) {

        return;

      }


      const user =
        await response.json();


      localStorage.setItem(
        "current_user",
        JSON.stringify(user)
      );


      window.location.href =
        "home.html";

    }
    catch (error) {

      console.warn(
        "Existing session could not be verified."
      );

    }

  }


  // ============================================================
  // PASSWORD VISIBILITY
  // ============================================================

  if (
    togglePassword &&
    passwordInput
  ) {

    togglePassword.addEventListener(
      "click",
      function () {

        const hidden =
          passwordInput.type ===
          "password";


        passwordInput.type =
          hidden
            ? "text"
            : "password";


        togglePassword.setAttribute(
          "aria-label",
          hidden
            ? "Hide password"
            : "Show password"
        );

      }
    );

  }


  // ============================================================
  // LOGIN SUBMIT
  // ============================================================

  if (loginForm) {

    loginForm.addEventListener(
      "submit",
      async function (
        event
      ) {

        event.preventDefault();


        if (loginSubmitting) {

          return;

        }


        clearLoginErrors();


        showMessage(
          loginMessage,
          ""
        );


        const email =
          emailInput
            ?.value
            .trim();


        const password =
          passwordInput
            ?.value;


        let valid =
          true;


        if (!email) {

          setFieldError(
            emailInput,
            "emailError",
            "Email ID is required."
          );

          valid =
            false;

        }
        else if (
          !isValidEmail(
            email
          )
        ) {

          setFieldError(
            emailInput,
            "emailError",
            "Enter a valid email address."
          );

          valid =
            false;

        }


        if (!password) {

          setFieldError(
            passwordInput,
            "passwordError",
            "Password is required."
          );

          valid =
            false;

        }


        if (!valid) {

          return;

        }


        loginSubmitting =
          true;


        setButtonLoading(
          loginButton,
          true
        );


        showMessage(
          loginMessage,
          "Authenticating..."
        );


        try {

          const result =
            await loginUser(
              email,
              password
            );


          saveAuthentication(
            result.access_token,
            result.user
          );


          showMessage(
            loginMessage,
            "Authentication successful. Opening dashboard...",
            "success"
          );


          setTimeout(
            function () {

              window.location.href =
                "home.html";

            },
            450
          );

        }
        catch (error) {

          showMessage(
            loginMessage,
            error.message,
            "error"
          );


          loginSubmitting =
            false;


          setButtonLoading(
            loginButton,
            false
          );

        }

      }
    );

  }


  // ============================================================
  // REGISTER SUBMIT
  // ============================================================

  if (registerForm) {

    registerForm.addEventListener(
      "submit",
      async function (
        event
      ) {

        event.preventDefault();


        if (
          registerSubmitting
        ) {

          return;

        }


        clearRegisterErrors();


        showMessage(
          registerMessage,
          ""
        );


        const name =
          registerName
            ?.value
            .trim();


        const email =
          registerEmail
            ?.value
            .trim();


        const password =
          registerPassword
            ?.value;


        const confirmPassword =
          registerConfirmPassword
            ?.value;


        let valid =
          true;


        if (
          !name ||
          name.length < 2
        ) {

          setFieldError(
            registerName,
            "registerNameError",
            "Enter your full name."
          );

          valid =
            false;

        }


        if (!email) {

          setFieldError(
            registerEmail,
            "registerEmailError",
            "Email ID is required."
          );

          valid =
            false;

        }
        else if (
          !isValidEmail(
            email
          )
        ) {

          setFieldError(
            registerEmail,
            "registerEmailError",
            "Enter a valid email address."
          );

          valid =
            false;

        }


        if (
          !password ||
          password.length < 6
        ) {

          setFieldError(
            registerPassword,
            "registerPasswordError",
            "Password must contain at least 6 characters."
          );

          valid =
            false;

        }


        if (
          confirmPassword !==
          password
        ) {

          setFieldError(
            registerConfirmPassword,
            "registerConfirmError",
            "Passwords do not match."
          );

          valid =
            false;

        }


        if (!valid) {

          return;

        }


        registerSubmitting =
          true;


        setButtonLoading(
          registerButton,
          true
        );


        showMessage(
          registerMessage,
          "Creating account..."
        );


        try {

          await registerUser(
            name,
            email,
            password
          );


          showMessage(
            registerMessage,
            "Registration successful. You may now sign in.",
            "success"
          );


          registerForm.reset();


          if (emailInput) {

            emailInput.value =
              email;

          }


          registerSubmitting =
            false;


          setButtonLoading(
            registerButton,
            false
          );


          setTimeout(
            function () {

              showMode(
                "login"
              );

            },
            850
          );

        }
        catch (error) {

          showMessage(
            registerMessage,
            error.message,
            "error"
          );


          registerSubmitting =
            false;


          setButtonLoading(
            registerButton,
            false
          );

        }

      }
    );

  }


  // ============================================================
  // MODE SWITCH
  // ============================================================

  function showMode(
    mode
  ) {

    if (loginForm) {

      loginForm.classList.toggle(
        "hidden",
        mode !== "login"
      );

    }


    if (registerForm) {

      registerForm.classList.toggle(
        "hidden",
        mode !== "register"
      );

    }


    document
      .querySelectorAll(
        "[data-mode]"
      )
      .forEach(
        function (
          button
        ) {

          button.classList.toggle(
            "active",
            button.dataset.mode ===
              mode
          );

        }
      );


    showMessage(
      loginMessage,
      ""
    );


    showMessage(
      registerMessage,
      ""
    );


    clearLoginErrors();

    clearRegisterErrors();

  }


  document
    .querySelectorAll(
      "[data-mode]"
    )
    .forEach(
      function (
        button
      ) {

        button.addEventListener(
          "click",
          function () {

            const mode =
              button.dataset.mode;


            if (
              mode === "login" ||
              mode === "register"
            ) {

              showMode(
                mode
              );

            }

          }
        );

      }
    );


  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  if (forgotPassword) {

    forgotPassword.addEventListener(
      "click",
      function () {

        showMessage(
          loginMessage,
          "Please contact the system administrator for password recovery.",
          "success"
        );

      }
    );

  }


  // ============================================================
  // OPTIONAL SUBTLE CARD MOVEMENT
  // ============================================================

  if (card) {

    document.addEventListener(
      "mousemove",
      function (
        event
      ) {

        if (
          window.innerWidth <
          900
        ) {

          card.style.transform =
            "none";

          return;

        }


        const x =
          (
            event.clientX /
            window.innerWidth
            -
            0.5
          );


        const y =
          (
            event.clientY /
            window.innerHeight
            -
            0.5
          );


        card.style.transform =
          `perspective(1000px)
           rotateY(${x * 1.6}deg)
           rotateX(${-y * 1.6}deg)`;

      }
    );


    document.addEventListener(
      "mouseleave",
      function () {

        card.style.transform =
          "none";

      }
    );

  }


  // ============================================================
  // START
  // ============================================================

  verifyExistingToken();


})();