(function () {
  "use strict";

  // ============================================================
  // ENVIRONMENTAL PREDICTION SYSTEM
  // FLOOD / FIRE / AIR MONITORING PAGES
  // ============================================================

  const page =
    document.body.dataset.hazard;

  const NODE_ID =
    "NODE-F01";

  const OFFLINE_AFTER_MS =
    12000;

  const REFRESH_MS =
    window.APP_CONFIG?.DEMO_REFRESH_MS ||
    3000;


  // ============================================================
  // PAGE CONFIGURATION
  // ============================================================

  const configs = {

    // ==========================================================
    // FLOOD
    // ==========================================================

    flood: {
      nodeId:
        NODE_ID,

      zone:
        "Flood Monitoring Zone",

      title:
        "Flood Prediction & Monitoring",

      subtitle:
        "Rain and ultrasonic water-level monitoring",

      riskKey:
        "flood_risk",

      statusBannerId:
        "floodStatusBanner",

      summaryId:
        "floodRiskSummary",

      nodeStatusId:
        "floodNodeStatus",

      metrics: [
        {
          label:
            "Water Level",

          key:
            "water_level",

          format(value) {
            return formatNumber(
              value,
              1,
              " cm"
            );
          }
        },

        {
          label:
            "Rain Sensor",

          key:
            "rainfall",

          format(value) {
            return formatNumber(
              value,
              0,
              " ADC"
            );
          }
        },

        {
          label:
            "Temperature",

          key:
            "temperature",

          format(value) {
            return formatNumber(
              value,
              1,
              " °C"
            );
          }
        },

        {
          label:
            "Humidity",

          key:
            "humidity",

          format(value) {
            return formatNumber(
              value,
              1,
              " %"
            );
          }
        }
      ],

      chartSeries(history) {
        return [
          {
            name:
              "Water Level",

            values:
              history.map(
                function (reading) {
                  return numberOrNull(
                    reading.water_level
                  );
                }
              )
          },

          {
            name:
              "Rain ADC",

            values:
              history.map(
                function (reading) {
                  return numberOrNull(
                    reading.rainfall
                  );
                }
              )
          }
        ];
      }
    },


    // ==========================================================
    // FIRE
    // ==========================================================

    fire: {
      nodeId:
        NODE_ID,

      zone:
        "Forest Monitoring Zone",

      title:
        "Forest Fire Monitoring",

      subtitle:
        "Temperature, humidity and MQ-2 smoke/gas monitoring",

      riskKey:
        "fire_risk",

      statusBannerId:
        "fireStatusBanner",

      summaryId:
        "fireRiskSummary",

      nodeStatusId:
        "fireNodeStatus",

      metrics: [
        {
          label:
            "Temperature",

          key:
            "temperature",

          format(value) {
            return formatNumber(
              value,
              1,
              " °C"
            );
          }
        },

        {
          label:
            "Humidity",

          key:
            "humidity",

          format(value) {
            return formatNumber(
              value,
              1,
              " %"
            );
          }
        },

        {
          label:
            "Smoke",

          key:
            "smoke",

          format(value) {
            return formatNumber(
              value,
              0,
              " ppm"
            );
          }
        },

        {
          label:
            "Gas",

          key:
            "gas",

          format(value) {
            return formatNumber(
              value,
              0,
              " ppm"
            );
          }
        }
      ],

      chartSeries(history) {
        return [
          {
            name:
              "Temperature",

            values:
              history.map(
                function (reading) {
                  return numberOrNull(
                    reading.temperature
                  );
                }
              )
          },

          {
            name:
              "MQ-2 Gas",

            values:
              history.map(
                function (reading) {
                  return numberOrNull(
                    reading.gas
                  );
                }
              )
          }
        ];
      }
    },


    // ==========================================================
    // AIR QUALITY
    // ==========================================================

    air: {
      nodeId:
        NODE_ID,

      zone:
        "Air Quality Monitoring Zone",

      title:
        "Air Pollution Monitoring",

      subtitle:
        "MQ-2 gas and environmental monitoring",

      riskKey:
        "air_risk",

      statusBannerId:
        "airStatusBanner",

      summaryId:
        "airRiskSummary",

      nodeStatusId:
        "airNodeStatus",

      metrics: [
        {
          label:
            "PM2.5",

          key:
            "pm25",

          format(value) {
            if (
              value === null ||
              value === undefined
            ) {
              return "--";
            }

            return formatNumber(
              value,
              0,
              " µg/m³"
            );
          }
        },

        {
          label:
            "Gas",

          key:
            "gas",

          format(value) {
            return formatNumber(
              value,
              0,
              " ppm"
            );
          }
        },

        {
          label:
            "Temperature",

          key:
            "temperature",

          format(value) {
            return formatNumber(
              value,
              1,
              " °C"
            );
          }
        },

        {
          label:
            "Humidity",

          key:
            "humidity",

          format(value) {
            return formatNumber(
              value,
              1,
              " %"
            );
          }
        }
      ],

      chartSeries(history) {
        return [
          {
            name:
              "MQ-2 Gas",

            values:
              history.map(
                function (reading) {
                  return numberOrNull(
                    reading.gas
                  );
                }
              )
          },

          {
            name:
              "Temperature",

            values:
              history.map(
                function (reading) {
                  return numberOrNull(
                    reading.temperature
                  );
                }
              )
          }
        ];
      }
    }
  };


  // ============================================================
  // CURRENT PAGE CONFIG
  // ============================================================

  const config =
    configs[page];

  if (!config) {
    console.error(
      "Unknown hazard page:",
      page
    );

    return;
  }


  // ============================================================
  // STATE
  // ============================================================

  let latestReading =
    null;

  let historyData =
    [];

  let loading =
    false;


  // ============================================================
  // BASIC HELPERS
  // ============================================================

  function getElement(id) {
    return document.getElementById(
      id
    );
  }


  function setText(
    id,
    value
  ) {
    const element =
      getElement(id);

    if (!element) {
      return;
    }

    element.textContent =
      value === null ||
      value === undefined ||
      value === ""
        ? "--"
        : value;
  }


  // ============================================================
  // NUMBERS
  // ============================================================

  function numberOrNull(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number =
      Number(value);

    return Number.isFinite(
      number
    )
      ? number
      : null;
  }


  function formatNumber(
    value,
    decimals = 1,
    suffix = ""
  ) {
    const number =
      numberOrNull(
        value
      );

    if (number === null) {
      return "--";
    }

    return (
      number.toFixed(decimals) +
      suffix
    );
  }


  // ============================================================
  // DATE PARSING
  // ============================================================

  function parseBackendDate(
    value
  ) {
    if (!value) {
      return null;
    }

    let dateValue =
      String(value);

    const hasTimezone =
      /Z$|[+-]\d{2}:\d{2}$/
        .test(
          dateValue
        );

    if (!hasTimezone) {
      dateValue +=
        "Z";
    }

    const date =
      new Date(
        dateValue
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;
  }


  // ============================================================
  // DATE DISPLAY
  // ============================================================

  function formatDateTime(
    value
  ) {
    const date =
      parseBackendDate(
        value
      );

    if (!date) {
      return "--";
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone:
          "Asia/Kolkata",

        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hour12:
          true,

        timeZoneName:
          "short"
      }
    ).format(
      date
    );
  }


  function createChartLabel(
    reading
  ) {
    const date =
      parseBackendDate(
        reading?.created_at
      );

    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone:
          "Asia/Kolkata",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hour12:
          true
      }
    ).format(
      date
    );
  }


  // ============================================================
  // RISK NORMALIZATION
  // ============================================================

  function normalizeRisk(
    value
  ) {
    const risk =
      String(
        value || "UNKNOWN"
      )
        .trim()
        .toUpperCase();

    if (
      risk === "SAFE" ||
      risk === "MEDIUM" ||
      risk === "CRITICAL" ||
      risk === "OFFLINE"
    ) {
      return risk;
    }

    if (
      risk === "HIGH" ||
      risk === "DANGER"
    ) {
      return "CRITICAL";
    }

    return "UNKNOWN";
  }


  function setStatus(
    id,
    value
  ) {
    const element =
      getElement(id);

    if (!element) {
      return;
    }

    const risk =
      normalizeRisk(
        value
      );

    element.textContent =
      risk;

    element.className =
      "status-pill status-" +
      risk.toLowerCase();
  }


  // ============================================================
  // STALE / OFFLINE CHECK
  // ============================================================

  function isReadingStale(
    reading
  ) {
    if (
      !reading ||
      !reading.created_at
    ) {
      return true;
    }

    const readingDate =
      parseBackendDate(
        reading.created_at
      );

    if (!readingDate) {
      return true;
    }

    const age =
      Date.now() -
      readingDate.getTime();

    if (
      age < -60000
    ) {
      return true;
    }

    return (
      age >
      OFFLINE_AFTER_MS
    );
  }


  function isHardwareOnline() {
    if (!latestReading) {
      return false;
    }

    if (
      typeof latestReading.online ===
        "boolean" &&
      latestReading.online === false
    ) {
      return false;
    }

    return !isReadingStale(
      latestReading
    );
  }


  // ============================================================
  // CURRENT PAGE RISK
  // ============================================================

  function getCurrentHazardRisk() {
    if (
      !isHardwareOnline()
    ) {
      return "OFFLINE";
    }

    return normalizeRisk(
      latestReading?.[
        config.riskKey
      ]
    );
  }


  // ============================================================
  // WATER LEVEL CLASSIFICATION
  // ============================================================

  function classifyWater(
    value
  ) {
    const water =
      numberOrNull(
        value
      );

    if (
      water === null
    ) {
      return "UNKNOWN";
    }

    if (
      water <= 90
    ) {
      return "SAFE";
    }

    if (
      water <= 110
    ) {
      return "MEDIUM";
    }

    return "CRITICAL";
  }


  // ============================================================
  // RAIN SENSOR CLASSIFICATION
  // ============================================================
  //
  // ADC < 1500       = CRITICAL
  // ADC 1500 - 3500  = MEDIUM
  // ADC > 3500       = SAFE
  //
  // ============================================================

  function classifyRain(
    value
  ) {
    const rain =
      numberOrNull(
        value
      );

    if (
      rain === null
    ) {
      return "UNKNOWN";
    }

    if (
      rain < 1500
    ) {
      return "CRITICAL";
    }

    if (
      rain <= 3500
    ) {
      return "MEDIUM";
    }

    return "SAFE";
  }


  function rainCondition(
    value
  ) {
    const rain =
      numberOrNull(
        value
      );

    if (
      rain === null
    ) {
      return "Unavailable";
    }

    if (
      rain < 1500
    ) {
      return "CRITICAL";
    }

    if (
      rain <= 3500
    ) {
      return "MEDIUM";
    }

    return "SAFE";
  }


  // ============================================================
  // TEMPERATURE CLASSIFICATION
  // ============================================================

  function classifyTemperature(
    value
  ) {
    const temperature =
      numberOrNull(
        value
      );

    if (
      temperature === null
    ) {
      return "UNKNOWN";
    }

    if (
      temperature < 25
    ) {
      return "SAFE";
    }

    if (
      temperature <= 30
    ) {
      return "MEDIUM";
    }

    return "CRITICAL";
  }


  // ============================================================
  // GAS CLASSIFICATION
  // ============================================================

  function classifyGas(
    value
  ) {
    const gas =
      numberOrNull(
        value
      );

    if (
      gas === null
    ) {
      return "UNKNOWN";
    }

    if (
      gas < 700
    ) {
      return "SAFE";
    }

    if (
      gas <= 1200
    ) {
      return "MEDIUM";
    }

    return "CRITICAL";
  }


  // ============================================================
  // NORMALIZE HISTORY
  // ============================================================

  function normalizeHistory(
    data
  ) {
    if (
      Array.isArray(data)
    ) {
      return data;
    }

    if (
      Array.isArray(
        data?.readings
      )
    ) {
      return data.readings;
    }

    if (
      Array.isArray(
        data?.data
      )
    ) {
      return data.data;
    }

    return [];
  }


  // ============================================================
  // HEADER
  // ============================================================

  function renderHeader() {
    setText(
      "pageTitle",
      config.title
    );

    setText(
      "pageSubtitle",
      config.subtitle
    );

    setText(
      "nodeId",
      config.nodeId
    );

    setText(
      "zone",
      config.zone
    );
  }


  // ============================================================
  // PAGE RISK
  // ============================================================

  function renderRisk() {
    setStatus(
      "riskLevel",
      getCurrentHazardRisk()
    );
  }


  // ============================================================
  // EMPTY METRICS
  // ============================================================

  function renderEmptyMetrics() {
    const container =
      getElement(
        "metrics"
      );

    if (!container) {
      return;
    }

    container.innerHTML =
      config.metrics
        .map(
          function (
            metric
          ) {
            return `
              <div class="metric">
                <span>
                  ${metric.label}
                </span>

                <b>
                  --
                </b>
              </div>
            `;
          }
        )
        .join("");
  }


  // ============================================================
  // METRICS
  // ============================================================

  function renderMetrics() {
    const container =
      getElement(
        "metrics"
      );

    if (!container) {
      return;
    }

    if (!latestReading) {
      renderEmptyMetrics();
      return;
    }

    container.innerHTML =
      config.metrics
        .map(
          function (
            metric
          ) {
            const value =
              latestReading[
                metric.key
              ];

            return `
              <div class="metric">
                <span>
                  ${metric.label}
                </span>

                <b>
                  ${metric.format(value)}
                </b>
              </div>
            `;
          }
        )
        .join("");
  }


  // ============================================================
  // CHART
  // ============================================================

  function renderChart() {
    const canvas =
      getElement(
        "trendChart"
      );

    if (
      !canvas ||
      !window.SimpleCharts
    ) {
      return;
    }

    if (
      historyData.length === 0
    ) {
      window.SimpleCharts.drawLine(
        canvas,
        {
          name:
            "No Data",

          values:
            []
        },
        null,
        []
      );

      return;
    }

    const series =
      config.chartSeries(
        historyData
      );

    const labels =
      historyData.map(
        createChartLabel
      );

    window.SimpleCharts.drawLine(
      canvas,
      series[0],
      series[1] || null,
      labels
    );
  }


  // ============================================================
  // CONNECTION STATUS
  // ============================================================

  function renderConnectionStatus() {
    const online =
      isHardwareOnline();

    setText(
      "updatedAt",

      latestReading
        ? formatDateTime(
            latestReading.created_at
          )
        : "--"
    );

    if (
      config.nodeStatusId
    ) {
      setText(
        config.nodeStatusId,

        online
          ? "ONLINE"
          : "OFFLINE"
      );
    }
  }


  // ============================================================
  // STATUS BANNER
  // ============================================================

  function renderStatusBanner() {
    const risk =
      getCurrentHazardRisk();

    const banner =
      getElement(
        config.statusBannerId
      );

    if (banner) {
      banner.dataset.risk =
        risk.toLowerCase();
    }

    let message =
      "Monitoring data available.";

    if (
      risk === "SAFE"
    ) {
      message =
        `${config.title}: monitored values are within the configured safe range.`;
    }

    if (
      risk === "MEDIUM"
    ) {
      message =
        `${config.title}: one or more monitored values are in the medium-risk range.`;
    }

    if (
      risk === "CRITICAL"
    ) {
      message =
        `${config.title}: critical conditions detected. Review the current readings and Alert Center.`;
    }

    if (
      risk === "OFFLINE"
    ) {
      message =
        `${NODE_ID} is offline or no fresh packet has been received within 12 seconds. Showing the latest stored values.`;
    }

    if (
      config.summaryId
    ) {
      setText(
        config.summaryId,
        message
      );
    }
  }


  // ============================================================
  // FLOOD DETAILS
  // ============================================================

  function renderFloodDetails() {
    if (
      page !== "flood"
    ) {
      return;
    }

    if (
      !isHardwareOnline()
    ) {
      setStatus(
        "waterThresholdStatus",
        "OFFLINE"
      );

      setText(
        "rainConditionStatus",
        "Unavailable"
      );

      setText(
        "mlFloodStatus",
        "Unavailable"
      );

      setStatus(
        "finalFloodRisk",
        "OFFLINE"
      );

      return;
    }


    const waterStatus =
      normalizeRisk(
        latestReading
          ?.water_level_status ||

        classifyWater(
          latestReading
            ?.water_level
        )
      );


    // ========================================================
    // IMPORTANT:
    // Rain risk is calculated directly from RAW ADC.
    // Old backend rain status cannot override this.
    // ========================================================

    const rainStatus =
      classifyRain(
        latestReading
          ?.rainfall
      );


    setStatus(
      "waterThresholdStatus",
      waterStatus
    );


    setText(
      "rainConditionStatus",

      rainCondition(
        latestReading
          ?.rainfall
      )
    );


    // Current backend does not store the transmitter ML
    // flood prediction separately.

    setText(
      "mlFloodStatus",
      "Unavailable"
    );


    // ========================================================
    // FINAL FLOOD RISK
    //
    // Use the latest water and RAW rain ADC classifications.
    // This prevents an old rain threshold from overriding
    // the new ADC rules on the frontend.
    // ========================================================

    const finalFloodRisk =
      riskPriority(
        waterStatus
      ) >=
      riskPriority(
        rainStatus
      )

        ? waterStatus
        : rainStatus;


    setStatus(
      "finalFloodRisk",
      finalFloodRisk
    );
  }


  // ============================================================
  // FIRE DETAILS
  // ============================================================

  function renderFireDetails() {
    if (
      page !== "fire"
    ) {
      return;
    }

    if (
      !isHardwareOnline()
    ) {
      setStatus(
        "fireTemperatureStatus",
        "OFFLINE"
      );

      setText(
        "fireHumidityStatus",
        "Unavailable"
      );

      setStatus(
        "fireSmokeStatus",
        "OFFLINE"
      );

      setStatus(
        "fireGasStatus",
        "OFFLINE"
      );

      return;
    }


    setStatus(
      "fireTemperatureStatus",

      latestReading
        ?.temperature_status ||

      classifyTemperature(
        latestReading
          ?.temperature
      )
    );


    setText(
      "fireHumidityStatus",

      numberOrNull(
        latestReading
          ?.humidity
      ) === null

        ? "Unavailable"
        : "DISPLAY ONLY"
    );


    setStatus(
      "fireSmokeStatus",

      latestReading
        ?.smoke_status ||

      classifyGas(
        latestReading
          ?.smoke
      )
    );


    setStatus(
      "fireGasStatus",

      latestReading
        ?.gas_status ||

      classifyGas(
        latestReading
          ?.gas
      )
    );
  }


  // ============================================================
  // AIR DETAILS
  // ============================================================

  function renderAirDetails() {
    if (
      page !== "air"
    ) {
      return;
    }

    if (
      !isHardwareOnline()
    ) {
      setText(
        "airPm25Status",
        "Unavailable"
      );

      setStatus(
        "airGasStatus",
        "OFFLINE"
      );

      setText(
        "airTemperatureStatus",
        "Unavailable"
      );

      setText(
        "airHumidityStatus",
        "Unavailable"
      );

      return;
    }


    setText(
      "airPm25Status",

      latestReading
        ?.pm25 === null ||

      latestReading
        ?.pm25 === undefined

        ? "Unavailable"
        : "Measured"
    );


    setStatus(
      "airGasStatus",

      latestReading
        ?.gas_status ||

      classifyGas(
        latestReading
          ?.gas
      )
    );


    setText(
      "airTemperatureStatus",

      numberOrNull(
        latestReading
          ?.temperature
      ) === null

        ? "Unavailable"
        : "DISPLAY ONLY"
    );


    setText(
      "airHumidityStatus",

      numberOrNull(
        latestReading
          ?.humidity
      ) === null

        ? "Unavailable"
        : "DISPLAY ONLY"
    );
  }


  // ============================================================
  // RISK PRIORITY
  // ============================================================

  function riskPriority(
    value
  ) {
    const risk =
      normalizeRisk(
        value
      );

    const priority = {
      UNKNOWN:
        -1,

      SAFE:
        0,

      MEDIUM:
        1,

      CRITICAL:
        2,

      OFFLINE:
        -1
    };

    return priority[
      risk
    ] ?? -1;
  }


  // ============================================================
  // CRITICAL POPUP
  // ============================================================

  function maybeShowCriticalPopup() {
    if (
      !isHardwareOnline()
    ) {
      return;
    }

    const currentRisk =
      getCurrentHazardRisk();

    const storageKey =
      `hazard-state-${page}`;

    const previousRisk =
      sessionStorage.getItem(
        storageKey
      );

    if (
      currentRisk ===
        "CRITICAL" &&

      previousRisk !==
        "CRITICAL"
    ) {
      const title =
        page === "flood"

          ? "Critical Flood Condition"

          : page === "fire"

            ? "Critical Fire Condition"

            : "Critical Air Quality Condition";


      window.alert(
        `${title}\n\n` +

        `Node: ${NODE_ID}\n` +

        `Recorded: ${formatDateTime(
          latestReading.created_at
        )}`
      );
    }

    sessionStorage.setItem(
      storageKey,
      currentRisk
    );
  }


  // ============================================================
  // COMPLETE RENDER
  // ============================================================

  function render() {
    renderHeader();

    renderRisk();

    renderMetrics();

    renderChart();

    renderConnectionStatus();

    renderStatusBanner();

    renderFloodDetails();

    renderFireDetails();

    renderAirDetails();

    maybeShowCriticalPopup();
  }


  // ============================================================
  // LOAD LATEST READING
  // ============================================================

  async function loadLatestReading() {
    latestReading =
      await window.getLatestReading(
        config.nodeId
      );

    if (
      isReadingStale(
        latestReading
      )
    ) {
      console.log(
        "Sensor node offline. Last stored reading:",
        latestReading
      );
    }

    else {
      console.log(
        `${page.toUpperCase()} LIVE DATA:`,
        latestReading
      );
    }
  }


  // ============================================================
  // LOAD HISTORY
  // ============================================================

  async function loadHistory() {
    const response =
      await window.getNodeHistory(
        config.nodeId,
        20
      );

    const readings =
      normalizeHistory(
        response
      );

    historyData =
      [...readings].sort(
        function (
          a,
          b
        ) {
          const dateA =
            parseBackendDate(
              a.created_at
            );

          const dateB =
            parseBackendDate(
              b.created_at
            );

          return (
            (
              dateA
                ? dateA.getTime()
                : 0
            )
            -
            (
              dateB
                ? dateB.getTime()
                : 0
            )
          );
        }
      );
  }


  // ============================================================
  // LOAD LIVE DATA
  // ============================================================

  async function loadLiveData() {
    if (
      loading
    ) {
      return;
    }

    loading =
      true;

    try {
      const results =
        await Promise.allSettled([
          loadLatestReading(),
          loadHistory()
        ]);


      const latestResult =
        results[0];

      if (
        latestResult.status ===
        "rejected"
      ) {
        latestReading =
          null;

        console.error(
          `Latest ${page} reading failed:`,
          latestResult.reason
        );
      }


      const historyResult =
        results[1];

      if (
        historyResult.status ===
        "rejected"
      ) {
        console.error(
          `${page} history failed:`,
          historyResult.reason
        );
      }


      render();
    }

    finally {
      loading =
        false;
    }
  }


  // ============================================================
  // REFRESH BUTTON
  // ============================================================

  function setupRefreshButton() {
    const button =
      getElement(
        "simulateBtn"
      );

    if (!button) {
      return;
    }

    button.textContent =
      "Refresh Live Data";

    button.addEventListener(
      "click",
      function () {
        loadLiveData();
      }
    );
  }


  // ============================================================
  // WINDOW RESIZE
  // ============================================================

  let resizeTimer =
    null;

  window.addEventListener(
    "resize",
    function () {
      clearTimeout(
        resizeTimer
      );

      resizeTimer =
        setTimeout(
          renderChart,
          150
        );
    }
  );


  // ============================================================
  // START
  // ============================================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      console.log(
        `${page} monitoring page loaded`
      );

      renderHeader();

      renderEmptyMetrics();

      setupRefreshButton();

      loadLiveData();

      setInterval(
        loadLiveData,
        REFRESH_MS
      );
    }
  );

})();