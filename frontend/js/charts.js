(function () {
  "use strict";

  window.SimpleCharts = {

    drawLine(
      canvas,
      seriesA,
      seriesB = null,
      labels = []
    ) {

      // =========================================================
      // BASIC VALIDATION
      // =========================================================

      if (!canvas) {
        console.warn(
          "SimpleCharts: canvas element not found."
        );
        return;
      }


      if (
        !seriesA ||
        !Array.isArray(seriesA.values)
      ) {
        console.warn(
          "SimpleCharts: invalid primary series."
        );
        return;
      }


      if (!Array.isArray(labels)) {
        labels = [];
      }


      // =========================================================
      // CANVAS SIZE
      // =========================================================

      const dpr =
        window.devicePixelRatio || 1;


      const rect =
        canvas.getBoundingClientRect();


      const displayWidth =
        Math.max(
          300,
          rect.width || 300
        );


      const displayHeight =
        Math.max(
          180,
          rect.height || 180
        );


      canvas.width =
        displayWidth * dpr;


      canvas.height =
        displayHeight * dpr;


      const ctx =
        canvas.getContext("2d");


      if (!ctx) {
        return;
      }


      // Reset transform before scaling.
      // Prevents repeated scaling when chart redraws.

      ctx.setTransform(
        1,
        0,
        0,
        1,
        0,
        0
      );


      ctx.scale(
        dpr,
        dpr
      );


      const width =
        displayWidth;


      const height =
        displayHeight;


      // =========================================================
      // CHART PADDING
      // =========================================================

      const padding = {
        left: 45,
        right: 20,
        top: 35,
        bottom: 35
      };


      // =========================================================
      // CLEAR CANVAS
      // =========================================================

      ctx.clearRect(
        0,
        0,
        width,
        height
      );


      ctx.fillStyle =
        "#ffffff";


      ctx.fillRect(
        0,
        0,
        width,
        height
      );


      // =========================================================
      // CLEAN NUMERIC DATA
      // =========================================================

      const valuesA =
        seriesA.values
          .map(Number)
          .filter(Number.isFinite);


      const valuesB =
        seriesB &&
        Array.isArray(seriesB.values)
          ? seriesB.values
              .map(Number)
              .filter(Number.isFinite)
          : [];


      const allValues = [
        ...valuesA,
        ...valuesB
      ];


      // =========================================================
      // NO DATA
      // =========================================================

      if (allValues.length === 0) {

        ctx.fillStyle =
          "#64748b";


        ctx.font =
          "14px Arial";


        ctx.textAlign =
          "center";


        ctx.fillText(
          "No chart data available",
          width / 2,
          height / 2
        );


        ctx.textAlign =
          "left";


        return;
      }


      // =========================================================
      // Y-AXIS RANGE
      // =========================================================

      let min =
        Math.min(...allValues);


      let max =
        Math.max(...allValues);


      /*
        If every value is exactly the same,
        create some vertical space around it.
      */

      if (min === max) {

        const paddingValue =
          Math.abs(min) > 0
            ? Math.abs(min) * 0.1
            : 1;


        min -= paddingValue;
        max += paddingValue;
      }


      const range =
        max - min;


      // =========================================================
      // GRID
      // =========================================================

      ctx.strokeStyle =
        "#e5e7eb";


      ctx.lineWidth =
        1;


      ctx.fillStyle =
        "#64748b";


      ctx.font =
        "11px Arial";


      ctx.textAlign =
        "left";


      const gridLines =
        5;


      for (
        let i = 0;
        i < gridLines;
        i++
      ) {

        const ratio =
          i /
          (gridLines - 1);


        const y =
          padding.top +
          (
            height -
            padding.top -
            padding.bottom
          ) *
          ratio;


        ctx.beginPath();


        ctx.moveTo(
          padding.left,
          y
        );


        ctx.lineTo(
          width -
          padding.right,
          y
        );


        ctx.stroke();


        const value =
          max -
          range *
          ratio;


        ctx.fillText(
          value.toFixed(1),
          5,
          y + 4
        );
      }


      // =========================================================
      // X POSITION
      // =========================================================

      function xPosition(
        index,
        total
      ) {

        if (total <= 1) {
          return (
            padding.left +
            (
              width -
              padding.left -
              padding.right
            ) /
            2
          );
        }


        return (
          padding.left +
          (
            width -
            padding.left -
            padding.right
          ) *
          (
            index /
            (total - 1)
          )
        );
      }


      // =========================================================
      // Y POSITION
      // =========================================================

      function yPosition(
        value
      ) {

        return (
          padding.top +
          (
            height -
            padding.top -
            padding.bottom
          ) *
          (
            1 -
            (
              value - min
            ) /
            range
          )
        );
      }


      // =========================================================
      // DRAW SERIES
      // =========================================================

      function plot(
        series
      ) {

        if (
          !series ||
          !Array.isArray(series.values) ||
          series.values.length === 0
        ) {
          return;
        }


        const data =
          series.values.map(
            function (value) {

              const number =
                Number(value);


              return Number.isFinite(number)
                ? number
                : null;
            }
          );


        const validCount =
          data.filter(
            function (value) {
              return value !== null;
            }
          ).length;


        if (validCount === 0) {
          return;
        }


        ctx.strokeStyle =
          series.color ||
          "#2563eb";


        ctx.lineWidth =
          2.5;


        ctx.lineJoin =
          "round";


        ctx.lineCap =
          "round";


        ctx.beginPath();


        let started =
          false;


        data.forEach(
          function (
            value,
            index
          ) {

            if (value === null) {
              started = false;
              return;
            }


            const x =
              xPosition(
                index,
                data.length
              );


            const y =
              yPosition(
                value
              );


            if (!started) {

              ctx.moveTo(
                x,
                y
              );

              started = true;

            } else {

              ctx.lineTo(
                x,
                y
              );

            }

          }
        );


        ctx.stroke();


        // =======================================================
        // DATA POINTS
        // =======================================================

        data.forEach(
          function (
            value,
            index
          ) {

            if (value === null) {
              return;
            }


            const x =
              xPosition(
                index,
                data.length
              );


            const y =
              yPosition(
                value
              );


            ctx.fillStyle =
              series.color ||
              "#2563eb";


            ctx.beginPath();


            ctx.arc(
              x,
              y,
              3.2,
              0,
              Math.PI * 2
            );


            ctx.fill();

          }
        );

      }


      // =========================================================
      // PLOT SERIES
      // =========================================================

      plot(
        seriesA
      );


      if (seriesB) {

        plot(
          seriesB
        );

      }


      // =========================================================
      // X-AXIS LABELS
      // =========================================================

      if (
        labels.length > 0
      ) {

        ctx.fillStyle =
          "#64748b";


        ctx.font =
          "11px Arial";


        ctx.textAlign =
          "center";


        /*
          Too many labels can overlap.
          Automatically skip some labels while keeping
          the underlying chart data untouched.
        */

        const maxLabels =
          8;


        const step =
          Math.max(
            1,
            Math.ceil(
              labels.length /
              maxLabels
            )
          );


        labels.forEach(
          function (
            label,
            index
          ) {

            if (
              index % step !== 0 &&
              index !==
              labels.length - 1
            ) {
              return;
            }


            const x =
              xPosition(
                index,
                labels.length
              );


            ctx.fillText(
              String(label),
              x,
              height - 10
            );

          }
        );


        ctx.textAlign =
          "left";
      }


      // =========================================================
      // LEGEND
      // =========================================================

      const legends = [
        seriesA,
        seriesB
      ].filter(
        function (series) {
          return (
            series &&
            Array.isArray(
              series.values
            ) &&
            series.values.length > 0
          );
        }
      );


      legends.forEach(
        function (
          series,
          index
        ) {

          const legendX =
            Math.max(
              padding.left,
              width - 170
            );


          const legendY =
            18 +
            index * 18;


          ctx.strokeStyle =
            series.color ||
            "#2563eb";


          ctx.lineWidth =
            3;


          ctx.beginPath();


          ctx.moveTo(
            legendX,
            legendY
          );


          ctx.lineTo(
            legendX + 14,
            legendY
          );


          ctx.stroke();


          ctx.fillStyle =
            "#334155";


          ctx.font =
            "11px Arial";


          ctx.fillText(
            series.name ||
            `Series ${index + 1}`,
            legendX + 20,
            legendY + 4
          );

        }
      );

    }

  };

})();