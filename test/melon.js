// Smoothly capped growth to prevent double precision floating point overflow
if (newLogTau > Number.MAX_VALUE) { 
    newLogTau = Number.MAX_VALUE; // Capping to prevent overflow
}
// Logic continues here...