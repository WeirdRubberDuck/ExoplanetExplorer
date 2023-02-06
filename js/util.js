// Check is variable has a value
function hasValue(value) {
    // We want to allow zeros
    if (value === 0) {
        return true;
    }
    else if (value) {
        // Truthy values
        return true;
    }
    else {
        // Falsy values
        return false;
    }
}

const compareArrays = (a, b) => {
    if (a.length !== b.length) return false;
    else {
      // Comparing each element of your array
      for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      return true;
    }
  };
