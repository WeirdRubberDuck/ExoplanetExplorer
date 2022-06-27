//////////////////////////////////////////////////////////////
///////////////////// Variables //////////////////////////////
//////////////////////////////////////////////////////////////

let parallelColumnSelection = {};
let matrixColumnSelection = {};

function onParallelColumnCheckBoxChange(element) {
  const key = element.id; // the id is the column name
  parallelColumnSelection[key] = element.checked;
  updateParallelCoordinates();
}

function onMatrixColumnCheckBoxChange(element) {
  const key = element.id; // the id is the column name
  matrixColumnSelection[key] = element.checked;
  updateScatterPlotMatrix();
}

function renderColumnSelection() {
  d3.select("#column-selection-parallel")
    .selectAll('li')
    .data(Object.keys(parallelColumnSelection).sort())
    .enter()
    .append("li")
    .style("list-style-type", "none")
    .style("width", "50%")
    .style("text-align", "left")
    .style("float", "left")
    .html(function(d) { 
      let isChecked = parallelColumnSelection[d];
      return (
        `<input type='checkbox' id='${d}' 
          ${isChecked && 'checked'} 
          onchange="onParallelColumnCheckBoxChange(this)"
        >
        <label for='${d}'>${d}</label>`
      ); 
    });

  d3.select("#column-selection-matrix")
    .selectAll('li')
    .data(Object.keys(matrixColumnSelection).sort())
    .enter()
    .append("li")
    .style("list-style-type", "none")
    .style("width", "50%")
    .style("text-align", "left")
    .style("float", "left")
    .html(function(d) { 
      let isChecked = matrixColumnSelection[d];
      return (
        `<input type='checkbox' id='${d}' 
          ${isChecked && 'checked'} 
          onchange="onMatrixColumnCheckBoxChange(this)"
        >
        <label for='${d}'>${d}</label>`
      ); 
    });
}
  