// id is the id of the div in which to render the chart
function ParallelCoordinatesChart(chartId, data, options) {
  let cfg = {
    w: 800,             // Width of the grid
    h: 600,             // Height of the grid
    margin: { 
      top: 50, 
      right: 50, 
      bottom: 50, 
      left: 50 
    },                    // The margins of the SVG
    strokeWidth: 2,       // The width of the stroke around each blob
    titleFactor: 1.1,     // How much farther than the height of the axes should the title be placed
    color: d3.scaleOrdinal(d3.schemeCategory10), // Color function. Based on id of data item
    lineOpacity: 1.0,     // Opacity of each line in the plot
    onItemMouseOver: undefined,
    onItemMouseOut: undefined,
    buildItemTooltipHTML: undefined,
    brushCallback: (selectedIds) => {}, // Function to call when brushing happens
    brushEndCallback: (selectedIds) => {}, // Function to call when brushing happens
    clearBrushesCallback: () => {},
    columns: undefined,
    uncertaintyData: undefined,
    showUncertaintyOnHover: true
  };

  // An object that will be returned and can be used to rerender certain thing
  let element = {};

  // Parse all options
  if (options !== undefined) {
    for (let i in options) {
      if (options[i] !== undefined) {
        cfg[i] = options[i];
      }
    }
  }

  let dimensions = cfg.columns ? cfg.columns : Object.keys(data[0]); // Names of each axis

  // Prepare uncertainty data for rendering
  const dimensionsWithUncertainty = dimensions.filter(d => 
    (`${d}err1` in uncertaintyData[0]) && (`${d}err2` in uncertaintyData[0])
  );

  // Initialize uncertainty data structure
  let uncertaintySelection = {};
  dimensionsWithUncertainty.forEach((d) => { uncertaintySelection[d] = false; });

  element.render = function() {
    /////////////////////////////////////////////////////////
    //////////// Create the container SVG and g /////////////
    /////////////////////////////////////////////////////////

    // Remove whatever chart with the same id/class was present before
    d3.select(`#${chartId}`).select("svg").remove();

    // Some extra height to fit stuff beneath the chart
    const extraHeight = 50;

    // Initiate the chart SVG
    let svg = d3.select(`#${chartId}`)
      .append("svg")
      .attr("width", cfg.w + cfg.margin.left + cfg.margin.right)
      .attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom + extraHeight)
      .attr("class", "parallel_" + chartId)
      .attr("class", "parallel")
      .append("g")
      .attr(
        "transform",
        "translate(" + cfg.margin.left + "," + cfg.margin.top + ")"
      );

    /////////////////////////////////////////////////////////
    ////////////////// Scales for axes //////////////////////
    /////////////////////////////////////////////////////////

    // Scale for the y axis
    let yScales = {};
    for (i in dimensions) {
      const name = dimensions[i]

      let isNumber = false;
      for (const row in data) {
        const value = data[row][name];
        if (value !== "" || value !== null) {
          // Found a value, test what it is
          isNumber = !isNaN(value);
          break;
        }
      }

      if (isNumber) {
        let values = data.map((function(d) { return +d[name]; }))
        values = values.filter((function(d) { return (d !== null && d !== undefined && d !== ""); }));
        yScales[name] = d3.scaleLinear()
          .domain(d3.extent(values))
          .range([cfg.h, 0])
          .nice();
      }
      else { // if string
        let domain = [];
        data.forEach((d) => {
          const value = d[name];
          if (!domain.includes(value)) {
            domain.push(value);
          }
        });
        domain = domain.sort().reverse();

        yScales[name] = d3.scalePoint()
          .domain(domain)
          .range([cfg.h, 0]);
      }
    }

    // Build the X scale -> it find the best position for each Y axis
    let xScale = d3.scalePoint()
      .domain(dimensions)
      .range([0, cfg.w]);

    /////////////////////////////////////////////////////////
    //////////////////// Draw the lines //////////////////////
    /////////////////////////////////////////////////////////
    const nanAxisYPos = 1.1 * cfg.h;

    function yPos(item, dim) {
      const hasValue = !(item[dim] === "" || item[dim] === null);
      return hasValue ? yScales[dim](item[dim]) : nanAxisYPos;
    }

    // OBS! Use only for numeric valeus
    function yPosUncertainty(item, dim, uncertainty = 0) {
      const hasValue = !(item[dim] === "" || item[dim] === null);
      return hasValue ? yScales[dim](item[dim] + uncertainty) : nanAxisYPos;
    }

    function path(item) {
      return d3.line()(dimensions.map(dim => [xScale(dim), yPos(item, dim)] ));
    }

    // Background lines for context
    let background = svg.selectAll(".myPath")
      .data(data)
      .enter().append("path")
      .attr("class", `contextLine ${chartId}`)
      .attr("d", path)
      .style("fill", "none")
      .style("stroke", "rgb(220, 220, 220)")
      .style("stroke-width", cfg.strokeWidth / 2 + "px");

    element.removeUncertaintyShape = function() {
      d3.selectAll(`.uncertaintyArea`).attr("visibility", "hidden");
    };
    element.renderUncertaintyShape = function(d) {
      d3.select(`#area-${d.id}`).attr("visibility", "visible");
    };

    function area(item) {
      let points = [];
      // Top points
      dimensions.forEach(dim => {
        let y = yPos(item, dim);
        if (dimensionsWithUncertainty.includes(dim)) {
          // Add positive uncertainty
          const uncertainty = uncertaintyData[item.id][`${dim}err1`];
          if (uncertainty !== null) {
            y = yPosUncertainty(item, dim, uncertainty);
          }
        }
        points.push([xScale(dim), y]);
      })
      // Bottom points
      dimensions.slice().reverse().forEach(dim => {
        let y = yPos(item, dim);
        if (dimensionsWithUncertainty.includes(dim)) {
          // Add negative uncertainty
          const uncertainty = uncertaintyData[item.id][`${dim}err2`];
          if (uncertainty !== null) {
            y = yPosUncertainty(item, dim, uncertainty);
          }
        }
        points.push([xScale(dim), y]);
      });
      return d3.line()(points);
    }

    let uncertaintyAreas = undefined;

    // Uncertainty area: render for all and show when hovered
    if (cfg.uncertaintyData && cfg.showUncertaintyOnHover) {
      uncertaintyAreas = svg.selectAll(".uncertaintyArea")
        .data(data)
        .enter().append("path")
        .attr("class", "uncertaintyArea")
        .attr("id", (d) => `area-${d.id}`)
        .attr('fill', (d) => cfg.color(d.id))
        .style("opacity", 0.5)
        .attr("visibility", "hidden")
        .attr('d', area);
    }

    // Foreground lines (colored)
    let foreground = svg.selectAll(".myPath")
      .data(data)
      .enter().append("path")
      .attr("class", `parallelLine ${chartId}`)
      .attr("id", (d) => `line-${d.id}`)
      .attr("dataId", (d) => `${d.id}`)
      .attr("d", path)
      .style("fill", "none")
      .style("stroke", (d) => cfg.color(d.id))
      .style("opacity", cfg.lineOpacity)
      .style("stroke-width", cfg.strokeWidth + "px")
      .on('mouseover', function (ev, d) {
        element.onLineMouseover(d, chartId);
        element.tooltip_mousemove(ev, d.id);
        if (cfg.onItemMouseOver) {
          cfg.onItemMouseOver(d.id, chartId);
        }
      })
      .on("mousemove", function(ev, d) {
        element.tooltip_mousemove(ev, d.id);
      })
      .on('mouseout', function(ev, d) {
        element.onLineMouseout(chartId)
        if (cfg.onItemMouseOut) {
          cfg.onItemMouseOut(d.id, chartId);
        }
        element.tooltip_mouseleave(ev, d.id);
      });

    /////////////////////////////////////////////////////////
    //////////////////// Draw the axes //////////////////////
    /////////////////////////////////////////////////////////

    // Draw the axes
    const axes = svg.selectAll(".dimension")
      .data(dimensions)
      .enter()
      .append("g")
      .attr("class", "dimension")
      // Translate this element to its right position on the x axis
      .attr("transform", function(d) { return "translate(" + xScale(d) + ")"; })
    
    // Build the axis and title
    axes.append("g")
      .attr("class", "axis")
      .each(function(d) { d3.select(this).call(d3.axisLeft().scale(yScales[d])); })
      .append("text")
      .attr("class", "legend")
      .style("text-anchor", "start")
      .style("font-size", "11px")
      .attr("transform", "rotate(-21)")
      .attr("y", -9)
      .text(function(d) { return d; })

    // Add and store a brush for each axis.
    const brushW = 7;
    axes.append("g")
      .attr("class", "brush")
      .each(function(d) { 
        d3.select(this).call(yScales[d].brush = d3.brushY()
          .extent([[-brushW, yScales[d].range()[1]], [brushW, yScales[d].range()[0]]])
          .on("start", onBrushStart)
          .on("brush", brush)
          .on("end", onBrushEnd)
        )
      });

    const NanBrushState = {
      Block: 'Block', // Hide nan values
      Filter: 'Filter', // Filter nan values / missing 
    };

    // A value => block out nan values
    let nanBrushes = {};

    function nanBrushColor(axis) {
      if (!nanBrushes[axis]) { return "darkgray"; }
      else if (nanBrushes[axis] === NanBrushState.Block) { return "rgba(220, 0, 0)"; }
      else if (nanBrushes[axis] === NanBrushState.Filter) { return "rgba(0, 220, 0)"; }
      else { return null; } // Shouldn't happen
    }

    // Add special brush (just a point) for NaN values
    axes
      .append("circle")
      .attr("class", "nanBrush")
      .attr("id", d => `nanBrush-${d}`)
      .on("click", (event, d) => {
        if (!nanBrushes[d]) {
          nanBrushes[d] = NanBrushState.Block;
        }
        else if (nanBrushes[d] === NanBrushState.Block) {
          nanBrushes[d] = NanBrushState.Filter;
        }
        else if (nanBrushes[d] === NanBrushState.Filter) {
          delete nanBrushes[d];
        }
        d3.select(event.currentTarget)
          .attr("fill", nanBrushColor(d));
        brush();
      })
      .attr("r", 4)
      .attr("cx", (d) => { xScale(d) })
      .attr("cy", nanAxisYPos)
      .attr("fill", "darkgray");

    function clearBrushes() {
      // Check which brushes need clearing
      let brushesToClear = [];
      d3.selectAll(".brush").each(function(d) {
        console.log(yScales[d].brushSelectionValue);
        if (yScales[d].brushSelectionValue) {
          brushesToClear.push(d);
        };
        d3.select(this).classed("toClear", true);
      });
      if (brushesToClear.length === 0) {
        console.log("No need to clear brushes");
        return;
      }

      console.log("Clearing brushes...");
      let startTime = performance.now();
      d3.selectAll(".toClear").each(function(d) {
        d3.select(this)
          .classed("toClear", false)
          .call(yScales[d].brush.clear);
      });
      nanBrushes = {};
      
      brush();
      d3.selectAll(".nanBrush").attr("fill", "darkgray")

      var endTime = performance.now();
      console.log(`Clearing brushes took ${endTime - startTime} milliseconds`)

      cfg.clearBrushesCallback();
    };

    element.clearParallelBrushSelection = clearBrushes;

    function onBrushStart(event, axis) {
      if (!yScales[axis].brushSelectionValue) {
        // Brush was selected => add nanBrush
        nanBrushes[axis] = NanBrushState.Block;
        d3.select(`#nanBrush-${axis}`)
          .attr("fill", nanBrushColor(axis));
      }
    }

    function onBrushEnd(event, axis) {
      if (!event.selection) {
        // Brush was cleared
        delete nanBrushes[axis];
        d3.select(`#nanBrush-${axis}`)
          .attr("fill", nanBrushColor(axis));
      }

      // Also do the final brushing
      brush(event);
    }

    // Handles a brush event, toggling the display of foreground lines.
    function brush() {
      let actives = [];
      let nanBrushesCopy = Object.assign({}, nanBrushes);
      svg.selectAll(".brush")
        .filter(function(d) {
          yScales[d].brushSelectionValue = d3.brushSelection(this);
          return d3.brushSelection(this);
        })
        .each(function(d) {
          // Get extents of brush along each active selection axis (the Y axes)
          actives.push({
              dimension: d,
              extent: d3.brushSelection(this),
              nanBrush: nanBrushesCopy[d]
          });

          // If there was a nan brush, remove it from the list so we can handle the rest separately
          if (nanBrushesCopy[d] !== undefined) {
            delete nanBrushesCopy[d];
          }
        });
      
      let selected = [];
      // Update foreground to only display selected values
      foreground.style("display", function(d) {
        let isActive = actives.every(function(active) {
          const value = d[active.dimension];
          if (value === null || value === undefined) {
            if (active.nanBrush === NanBrushState.Block) {
              // If there is a blocking brush, we want to hide the nan values
              return false;
            }
            return true;
          }
          const scaledValue = yScales[active.dimension](value);
          let result = active.extent[0] <= scaledValue && scaledValue <= active.extent[1];
          return result;
        });
        
        // When no selectors are active, all data should be visible.
        isActive = (actives.length === 0 ) ? true : isActive;

        // Check if it's affected by any other nan value filter
        if (isActive) {
          Object.keys(nanBrushesCopy).forEach(dim => {
            if (!nanBrushesCopy[dim] ) {
              return; // Do nothing if no nan brush
            }
            const value = d[dim];
            if ((value === null || value === undefined)) { // missing value
              if ((nanBrushesCopy[dim] === NanBrushState.Block)) {
                isActive = false; // Hide line if it has no and brush is in block mode
              }
            }
            else { // has value
              if ((nanBrushesCopy[dim] === NanBrushState.Filter)) {
                isActive = false; // Hide line if it has value and nan brush filter mode
              }
            }
          })
        }
      
        // Only render rows that are active across all selectors
        if (isActive) selected.push(d);
        return (isActive) ? null : "none";
      });

      // Call callback with selected ids
      cfg.brushCallback(selected.map(d => d.id));
    }

    /////////////////////////////////////////////////////////
    ////////////////// Separating line //////////////////////
    /////////////////////////////////////////////////////////

    // Draw a line and some text
    const lineY = nanAxisYPos + 20;
    const linexMarginRight = 30;
    const linexMarginLeft = 0.8 * cfg.margin.left;
    const textPositionX = 0 - 0.95 * linexMarginLeft;
    const lineTextColor = "rgb(200, 200, 200)";

    const line = d3.line()([
      [0 - linexMarginLeft, lineY], 
      [cfg.w + linexMarginRight, lineY]
    ]);

    svg.append("path")
      .attr("class", `contextLine ${chartId}`)
      .attr("d", line)
      .style("fill", "none")
      .style("stroke", "rgb(150, 150, 150)")
      .style("stroke-width", "0.2px");

    if (uncertaintyData) {
      svg.append("g")
        .append("text")
        .attr("x", textPositionX)
        .attr("y", lineY)
        .attr("dy", "1em")
        .text("uncertainty axis")
        .style("fill", lineTextColor)
        .style("font-style", "italic")
        .style("font-size", "small");
    }

    svg.append("g")
      .append("text")
      .attr("x", textPositionX)
      .attr("y", lineY)
      .attr("dy", "-0.5em")
      .text("missing values")
      .style("fill", lineTextColor)
      .style("font-style", "italic")
      .style("font-size", "small");

    /////////////////////////////////////////////////////////
    //////// Checkboxes to show uncertainty axes ////////////
    /////////////////////////////////////////////////////////

    const isSelected = (dim) => {
      return uncertaintySelection[dim] === true;
    };

    if (uncertaintyData && uncertaintyData.length > 0) {
      renderCheckBoxes(); 
    }

    const onCheckBoxClick = (dim) => {
      console.log(dim);
      // Toggle uncertainty
      uncertaintySelection[dim] = !uncertaintySelection[dim];
      console.log(uncertaintySelection)
      renderCheckBoxes();
    };

    function renderCheckBoxes() {
      const checkboxSize = 12; 
      let boxes = axes.append("rect")
        .filter((d) => { return (dimensionsWithUncertainty.includes(d)); })
        .attr("class", "uncertaintyCheckbox")
        .attr("x", (d) => { xScale(d) })
        .attr("transform", (d) => {
          return "translate(" + -0.5*checkboxSize + ")";
        })
        .attr("y", lineY + checkboxSize/2)
        .attr("rx", "2")
        .attr("ry", "2" )
        .attr("width", checkboxSize)
        .attr("height", checkboxSize)
        .attr("stroke", "darkgray")
        .attr("stroke-width", "1px")
        .attr("fill", "white")
        .on("click", (event, d) => onCheckBoxClick(d))

        boxes
          .filter((d) => { return isSelected(d); })
          .attr("fill", "rgb(0, 115, 255)")
          .attr("stroke", "none")

        const checkmarkPath = () => {
          const y = lineY + checkboxSize/2;
          return d3.line()([
            [0.2 * checkboxSize, y + 0.5 * checkboxSize], 
            [0.4 * checkboxSize, y + 0.69 * checkboxSize],
            [0.8 * checkboxSize, y + 0.2 * checkboxSize],
          ]);
        }

        // Checkmark (always rendered, but not visible with white background)
        axes.append("path")
          .filter((d, index) => { 
            // Only show if there is uncertainty columns
            return (`${d}err1` in uncertaintyData[0]) && (`${d}err2` in uncertaintyData[0]);
          })
          .attr("class", `uncertaintyCheckbox`)
          .attr("d", (d) => checkmarkPath())
          .attr("transform", (d) => {
            return "translate(" + -0.5*checkboxSize + ")";
          })
          .style("fill", "none")
          .style("stroke", "white")
          .style("stroke-width", "2px");
    }

    /////////////////////////////////////////////////////////
    ////////////////// Reordering Axes //////////////////////
    /////////////////////////////////////////////////////////
    // Implemented based on example: https://bl.ocks.org/jasondavies/1341281

    let dragging = {};

    // Poisiton of a dimension (axis)
    function position(d) {
      var v = dragging[d];
      return v == null ? xScale(d) : v;
    }

    // Transition used ot move an axis to its correct position
    function transition(g) {
      return g.transition().delay(100).duration(500);
    }

    function dragStarted(event, d) {
      // Prevent dragging from anywhere else than title, which is placed at y < 0
      if (event.y > 0) return;
      dragging[d] = xScale(d);
      background.attr("visibility", "hidden");
    }

    function dragged(event, d) {
      if (dragging[d] === undefined) return;
      dragging[d] = Math.min(cfg.w + 10, Math.max(-10, event.x));
      dimensions.sort(function(a, b) { return position(a) - position(b); });
      xScale.domain(dimensions);
      axes.attr("transform", (d) => {
        return "translate(" + position(d) + ")";
      });
    }

    function dragEnded(event, d) {
      if (dragging[d] === undefined) return;
      delete dragging[d];

      transition(d3.select(this)).attr("transform", "translate(" + xScale(d) + ")");
      transition(foreground).attr("d", path);
      if (uncertaintyAreas !== undefined) {
        transition(uncertaintyAreas).attr("d", area);
      }

      background
          .attr("d", path)
        .transition()
          .delay(500)
          .duration(0)
          .attr("visibility", "visible");
    }

    const drag = d3.drag()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded)

    axes.call(drag)
    axes.selectAll(".legend")
      .style("cursor", "move")

    /////////////////////////////////////////////////////////
    //////////////////// Item tooltip ///////////////////////
    /////////////////////////////////////////////////////////

    var tooltip = d3.select(`#${chartId}`)
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("position","absolute");

    // Three function that change the tooltip when user move / leave a blob
    element.tooltip_mousemove = function(event, id) {
      tooltip.style("opacity", 1)

      let content = "no content";
      if (cfg.buildItemTooltipHTML) {
        content = cfg.buildItemTooltipHTML(id);
      }
      tooltip
        .html(content)
        .style("left", (event.pageX+20) + "px")
        .style("top", (event.pageY) + "px")
    }
    element.tooltip_mouseleave = function(event, id) {
      tooltip
        .style("opacity", 0)
        // Also move tooltip out of the way
        .style("left", "-1000px")
        .style("top", "-1000px")
    }
  } // render

  element.updateParallelLineColors = function(chartId, colorFunction) {
    d3.selectAll(`.parallelLine.${chartId}`)
      .style("stroke", (d) => colorFunction(d.id))
  }

  element.onLineMouseover = function(d) {
    let fadeOpacity = 0.001;
  
    // Dim all but the current line
    d3.selectAll(`.parallelLine.${chartId}`)
      .filter((item) => {
        return item.id !== d.id; // Check if same item
      })
      .transition()
      .duration(200)
      .style("opacity", fadeOpacity);
  
    // Thicken and highlight current line
    d3.select(`#line-${d.id}`)
      .transition(200)
      .style("stroke-width", 1.5 * cfg.strokeWidth + "px")
      .style("opacity", 1.0);
  
    element.renderUncertaintyShape(d);
  }

  element.onLineMouseout = function() {
    // Reset changes
    d3.selectAll(`.parallelLine.${chartId}`)
      .transition()
      .duration(200)
      .style("stroke-width", cfg.strokeWidth + "px")
      .style("opacity", cfg.lineOpacity);
  
    element.removeUncertaintyShape();
  } 

  return element;
  
} //ParallelCoordinates
