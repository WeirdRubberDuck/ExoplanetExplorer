// Variable for js libarary
var openspace = null;

// Try to connect to OpenSpace
function tryConnectToOpenSpace() {
  document.getElementById('connection-status').className = "connecting";
  updateStatusDiv("Connecting..");
  connectToOpenSpace(hostIp, hostPort);
}

// Helper function to connect to opensapce
function connectToOpenSpace(host, port) {
  var api = window.openspaceApi(host, port);

  // Notify users on disconnect
  api.onDisconnect(() => {
    console.log("OpenSpace disconnected");
    updateStatusDiv("Disconnected to OpenSpace", true);
    document.getElementById('connection-status').className = "disconnected";
    openspace = null;
  });

  // Notify users on connect
  api.onConnect(async () => {
    try {
      openspace = await api.library(false);
      console.log("OpenSpace connected");
      updateStatusDiv("Connected to OpenSpace");
      document.getElementById('connection-status').className = "connected";
    } catch (e) {
      console.log('OpenSpace library could not be loaded: Error: \n', e)
      updateStatusDiv("Failed connecting to OpenSpace", true);
      document.getElementById('connection-status').className = "disconnected";
      return;
    }
  })

  // Connect
  api.connect();
};

function updateStatusDiv(message = "", showButton = false) {
  let contentString = "";
  if (message != "") {
    contentString += `<p id="connection-status-message">${message}</p>`;
    if(showButton) {
      contentString += `<button id="reload-button" onClick="document.location.reload(true);">Connect</button>`;
    }
  }
  else {
    _isFlashing = false;
  }

  document.getElementById('connection-status').innerHTML = contentString;
}