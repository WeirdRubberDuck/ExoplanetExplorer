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
