//////////////////////////////////////////////////////////////
///////////////////// Variables //////////////////////////////
//////////////////////////////////////////////////////////////

let colorScale = undefined;
let alwaysSetColorFromSelection = false;

let colorColumn = "pl_bmasse";

//////////////////////////////////////////////////////////////
///////////////// ColorMap control ///////////////////////////
//////////////////////////////////////////////////////////////
function populateColorChoiceList() {
  let select = d3.select("#colormap-axis-select")
    .on("change", function(d) {
      const value = d3.select(this).property("value");
      colorColumn = value;
      updateColorMap();
      updateChartColorMapping();
    })
    .style("width", "30%");

  select.selectAll("option")
    .data(Object.keys(parallelColumnSelection).sort())
    .enter()
    .append("option")
    .attr("value", function(d) { return d; })
    .attr("selected", function(d) { return (d === colorColumn) ? "selected" : null })
    .text(function(d) { return d; });
}


function updateColorMapLegend(isNumeric) {
  let legend = undefined;
  if (isNumeric) {
    legend = Legend(colorScale, {
      title: colorColumn,
      width: 200
    });
  }
  else {
    legend = Swatches(colorScale, { // Could also do just a "Legend"
      title: colorColumn,
      width: 200
    });
  }

  document.getElementById("colormap-axis-select").value = colorColumn;

  document.getElementById(`colormap-legend`).innerHTML = "";
  document.getElementById("colormap-legend").appendChild(legend);
}


function updateColorMap() {
  let colorMapData = dataToShow;
  if (alwaysSetColorFromSelection && brushSelection) {
    colorMapData = colorMapData.filter(d => brushSelection.includes(d.id));
  }
  let values = colorMapData.map(d => d[colorColumn]);

  // Try to create numeric values of all values and see if it works
  const numberCheck = values.map(d => d === "" ?  -99999 : Number(d)).filter(d => !isNaN(d));
  const isNumeric = numberCheck.length === values.length;

  if (isNumeric) {
    // Get only valid numbers
    values = values.map(d => parseFloat(d)).filter(d => !isNaN(d));
    colorScale = d3.scaleSequential() 
      .domain(d3.extent(values))
      .interpolator(d3.interpolateViridis);
  }
  else { // ordinal
    // Find unique and non Nan elements
    let uniqueCategories = values.filter((item, i, array) => array.indexOf(item) === i && item != "");
    if (uniqueCategories.length == 1) { // Need at least two values for domain
      uniqueCategories = [uniqueCategories[0], uniqueCategories[0]];
    }

    colorScale = d3.scaleOrdinal()
      .domain(uniqueCategories.sort())
      .range(uniqueCategories.map((val, i) => 
        d3.interpolateViridis(i / (uniqueCategories.length - 1))
      ));
  }

  updateColorMapLegend(isNumeric);

  // Clear the buttons
  d3.select("#left-color-handle").html("");
  d3.select("#right-color-handle").html("");

  // Add color map control buttons
  if (isNumeric  && !alwaysSetColorFromSelection) {
    const updateDomain = (i, delta) => {
      let newDomain = colorScale.domain();
      newDomain[i] += delta * (newDomain[1] - newDomain[0]);
      colorScale.domain(newDomain)
    }

    d3.select("#right-color-handle")
      .append("input")
      .attr("type", "button")
      .style("margin", "0.3em")
      .style("cursor", "move")
      .call(d3.drag()
        .on("drag", (event, d) => {
          const delta = event.dx/100;
          updateDomain(1, delta);
          updateColorMapLegend(isNumeric);
        })
        .on("end", (event, d) => {
          updateChartColorMapping();
        }));      

    d3.select("#left-color-handle")
      .append("input")
      .attr("type", "button")
      .style("margin", "0.3em")
      .style("cursor", "move")
      .call(d3.drag()
        .on("drag", (event, d) => {
          const delta = event.dx/100;
          updateDomain(0, delta);
          updateColorMapLegend(isNumeric);
        })
        .on("end", (event, d) => {
          updateChartColorMapping();
        }));
  }
}


function onCheckboxSetColorFromSelectionChange(element) {
  alwaysSetColorFromSelection = element.checked;
  updateColorMap();
  updateChartColorMapping();
}

function resetColorMapButtonClick() {
  updateColorMap();
  updateChartColorMapping();
}

function colorFunction(id) {
  const row = fullData[id];
  let value = row[colorColumn];
  if (!value) {
    return "gray"; // nan color
  }
  return colorScale(value);
}