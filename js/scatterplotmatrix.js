// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/splom

// Based on that example, but updated to:
// - handle any color scale and
// - hide upper plots
// - minimum height

function ScatterplotMatrix(chartId, data, {
  columns = data.columns, // array of column names, or accessor functions
  x = columns, // array of x-accessors
  y = columns, // array of y-accessors
  z = () => 1, // given d in data, returns the (categorical) z-value  // OBS! Changed to be the ID of the points
  padding = 20, // separation between adjacent cells, in pixels
  marginTop = 50, // top margin, in pixels
  marginRight = 50, // right margin, in pixels
  marginBottom = 30, // bottom margin, in pixels
  marginLeft = 50, // left margin, in pixels
  maxCellSize = 200,
  width = 928, // outer width, in pixels
  // height = width, // outer height, in pixels
  xType = d3.scaleLinear, // the x-scale type
  yType = d3.scaleLinear, // the y-scale type
  zDomain, // array of z-values
  fillOpacity = 0.7, // opacity of the dots
  colors = d3.schemeCategory10, // array of colors for z
  isFiltered = (z) => false, // function that decides if a point with a certain ID (z-value) is filtered
  onItemMouseOver = undefined,
  onItemMouseOut = undefined,
  buildItemTooltipHTML = undefined,
  hideLowerPlots = true,
} = {}) {
  // Compute values (and promote column names to accessors).
  const X = d3.map(x, x => d3.map(data, typeof x === "function" ? x : d => d[x]));
  const Y = d3.map(y, y => d3.map(data, typeof y === "function" ? y : d => d[y]));
  const Z = d3.map(data, z);

  // Compute default z-domain, and unique the z-domain.
  if (zDomain === undefined) zDomain = Z;
  zDomain = new d3.InternSet(zDomain);

  // Omit any data not present in the z-domain.
  const I = d3.range(Z.length).filter(i => zDomain.has(Z[i]));

  // Compute the inner dimensions of the cells.
  let cellWidth = (width - marginLeft - marginRight - (X.length - 1) * padding) / X.length;
  // let cellHeight = (height - marginTop - marginBottom - (Y.length - 1) * padding) / Y.length;
  cellWidth = Math.min(maxCellSize, cellWidth);
  cellHeight = cellWidth;

  const allCellsWidth = (cellWidth + padding) * X.length - padding;

  height = Y.length * cellHeight + (Y.length - 1) * padding + marginTop + marginBottom;

  // Construct scales and axes.
  const xScales = X.map(X => xType(d3.extent(X), [0, cellWidth]));
  const yScales = Y.map(Y => yType(d3.extent(Y), [cellHeight, 0]));
  const xAxis = d3.axisTop().ticks(cellWidth / 35);
  const yAxis = d3.axisRight().ticks(cellHeight / 35);

  // Remove whatever chart with the same id/class was present before
  d3.select(`#${chartId}`).select("svg").remove();

  const svg = d3.select(`#${chartId}`)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-marginLeft, -marginTop, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  // x - strokes. TODO: respect bounds of the boxes
  svg.append("g")
    .selectAll("g")
    .data(xScales)
    .join("g")
      .attr("transform", (d, i) => `translate(${i * (cellWidth + padding)},0)`)
      .each(function(xScale, i) {
        if (hideLowerPlots && i === 0) {
          return ""; // Hide first axis
        }
        return d3.select(this).call(xAxis.scale(xScale));
      })
      // TODO: bring back lines
      // .call(g => g.select(".domain").remove())
      // .call(g => g.selectAll(".tick line").clone()
      //     .attr("x2", width - marginLeft - marginRight)
      //     .attr("stroke-opacity", 0.1));

  // y - strokes. TODO: respect bounds of the boxes
  svg.append("g")
    .selectAll("g")
    .data(yScales)
    .join("g")
      .attr("transform", (d, i) => `translate(${allCellsWidth},${i * (cellHeight + padding)})`)
      .each(function(yScale, i) {
        if (hideLowerPlots && i === yScales.length - 1) {
          return ""; // Hide last axis
        }
        return d3.select(this).call(yAxis.scale(yScale));
      })
      // TODO: bring back lines
      // .call(g => g.select(".domain").remove())
      // .call(g => g.selectAll(".tick line").clone()
      //     .attr("y2", -height + marginTop + marginBottom)
      //     .attr("stroke-opacity", 0.1))

  const cell = svg.append("g")
    .selectAll("g")
    .data(d3.cross(d3.range(X.length), d3.range(Y.length)))
    .join("g")
      .filter(([i, j]) => { return hideLowerPlots ? i >= j : true; })
      .attr("fill-opacity", fillOpacity)
      .attr("transform", ([i, j]) => `translate(${i * (cellWidth + padding)},${j * (cellHeight + padding)})`);

  // Box around cell
  cell.append("rect")
      .attr("fill", "none")
      .attr("stroke", "currentColor")
      .attr("width", cellWidth)
      .attr("height", cellHeight);

  const isValidPoint = (i, x, y) => {
    const xVal = X[x][i];
    const yVal = Y[y][i];
    return xVal && yVal && !isNaN(xVal) && !isNaN(yVal);
  };

  // Add background data points
  cell.each(function([x, y]) {
    d3.select(this).selectAll(".backgroundCircle")
      .data(I.filter(i => {
        const inDiagonal = x === y;
        return !inDiagonal && isValidPoint(i, x, y);
      }))
      .join("circle")
        .attr("class",  i => `backgroundCircle`)
        .attr("r", 2)
        .attr("cx", i => xScales[x](X[x][i]))
        .attr("cy", i => yScales[y](Y[y][i]))
        .attr("fill", "rgb(220, 220, 220)");
  });

  // Add foreground data points
  cell.each(function([x, y]) {
    d3.select(this).selectAll(".foregroundCircle")
      .data(I.filter(i => {
        const inDiagonal = x === y;
        return !inDiagonal && !isFiltered(Z[i]) && isValidPoint(i, x, y);
      }))
      .join("circle")
        .attr("class", i => `foregroundCircle scatterPoint-${Z[i]} ${chartId}`)
        .attr("pointId", i => `${Z[i]}`) // TODO: Not correct!!
        .attr("r", 3.5)
        .attr("cx", i => xScales[x](X[x][i]))
        .attr("cy", i => yScales[y](Y[y][i]))
        .attr("fill", i => colors(Z[i]))
        .on('mouseover', function (ev, d) {
          const currentId = Z[d];
          let fadeOpacity = 0.1;

          // Dim all but the current point
          let points = document.querySelectorAll(
            `.foregroundCircle:not(.scatterPoint-${currentId})`
          );
          if (points) {
            points.forEach(p => { p.style.opacity = fadeOpacity; });
          }

          if (onItemMouseOver) {
            onItemMouseOver(Z[d], chartId);
          }
        })
        .on("mousemove", function(ev, d) {
          tooltip_mousemove(ev, Z[d]);
        })
        .on('mouseout', function(ev, d) {
          // Reset changes
          d3.selectAll(`.foregroundCircle.${chartId}`)
            .style("opacity", 1.0);

          if (onItemMouseOut) {
            onItemMouseOut(Z[d], chartId);
          }
          tooltip_mouseleave(ev,Z[d]);
        });
  });

  // Add labels for symmetric matrices
  // TODO Support labeling for asymmetric sploms?
  if (x === y) svg.append("g")
      .attr("font-size", 18)
      .attr("font-family", "sans-serif")
      .attr("font-weight", "bold")
    .selectAll("text")
    .data(x)
    .join("text")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${i * (cellWidth + padding)},${i * (cellHeight + padding)})`)
      .attr("x", cellWidth / 2)
      .attr("y", cellHeight / 2)
      .style("text-anchor", "middle")
      // .attr("dy", ".71em")
      .text(d => d);

  /////////////////////////////////////////////////////////
  //////////////////// Item tooltip ///////////////////////
  /////////////////////////////////////////////////////////

  let tooltip = d3.select(`#${chartId}`)
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("position","absolute");

  // Three function that change the tooltip when user move / leave a blob
  function tooltip_mousemove(event, id) {
    tooltip.style("opacity", 1)
    let content = "no content";
    if (buildItemTooltipHTML) {
      content = buildItemTooltipHTML(id);
    }
    tooltip
      .html(content)
      .style("left", (event.pageX+20) + "px")
      .style("top", (event.pageY) + "px")
  }
  function tooltip_mouseleave(event, id) {
    tooltip
      .style("opacity", 0)
      // Also move tooltip out of the way
      .style("left", "-1000px")
      .style("top", "-1000px")
  }
}
