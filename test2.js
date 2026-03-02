var id = "adaptive_multi_regime";
var name = "Adaptive Multi-Regime Stability";
var description = "A self-organizing growth system with equilibrium, stability, and stress.";
var authors = "qrze, melon";
var version = 1;

var currency;
var x = 1;
var E = 1;
var S = 1;
var D = 0;

// Upgrades
var a, b, c, alpha;

// Milestones
var milestoneResonance, milestoneEquilibriumBoost, milestoneStressFeedback;

// Constants
var lambda = 0.05;
var eta = 0.05;
var theta = 0.1;
var kappa = 0.1;
var rho = 0.02;

function init() {
    currency = theory.createCurrency();

    // -------------------
    // Upgrade a: equilibrium growth
    // -------------------
    a = theory.createUpgrade(0, currency, new ExponentialCost(5,2));
    a.getDescription = (level) => "Increase equilibrium growth: +" + (0.05*level).toFixed(2);
    a.getInfo = (level) => "a=" + (0.1 + 0.05*level).toFixed(2);

    // -------------------
    // Upgrade b: equilibrium decay reduction
    // -------------------
    b = theory.createUpgrade(1, currency, new ExponentialCost(10,2.2));
    b.getDescription = (level) => "Reduce equilibrium decay: +" + (0.05/(1+level)).toFixed(3);
    b.getInfo = (level) => "b=" + (0.05/(1+level)).toFixed(3);

    // -------------------
    // Upgrade c: stability regen
    // -------------------
    c = theory.createUpgrade(2, currency, new ExponentialCost(20,2.5));
    c.getDescription = (level) => "Increase stability regen: +" + (0.03*level + 0.05).toFixed(3);
    c.getInfo = (level) => "c=" + (0.05 + 0.03*level).toFixed(3);

    // -------------------
    // Upgrade alpha: equilibrium exponent
    // -------------------
    alpha = theory.createUpgrade(3, currency, new ExponentialCost(50,3));
    alpha.getDescription = (level) => "Increase equilibrium exponent: +" + (0.02*level).toFixed(3);
    alpha.getInfo = (level) => "α=" + (1 + 0.02*level).toFixed(3);

    // -------------------
    // Milestones
    // -------------------
    theory.setMilestoneCost(new LinearCost(10,10));
    milestoneResonance = theory.createMilestoneUpgrade(0,1);
    milestoneResonance.getDescription = () => "Resonance doubles growth near x≈E";
    milestoneEquilibriumBoost = theory.createMilestoneUpgrade(1,1);
    milestoneEquilibriumBoost.getDescription = () => "Add log(x) to dE/dt";
    milestoneStressFeedback = theory.createMilestoneUpgrade(2,1);
    milestoneStressFeedback.getDescription = () => "Convert stress into stability";
}

function tick(elapsedTime, multiplier) {
    var dt = elapsedTime*multiplier;

    // Compute upgrade effects from level
    var A = 0.1 + 0.05*a.level;
    var B = 0.05/(1 + b.level);
    var C = 0.05 + 0.03*c.level;
    var Alpha = 1 + 0.02*alpha.level;

    // Ratio for equilibrium-stress interaction
    var ratio = x / Math.max(E,1e-10);

    // dE/dt
    var dE = A * Math.pow(x,Alpha) - B * E;
    if(milestoneEquilibriumBoost.level>0) dE += Math.log(x + 1);

    // dS/dt
    var dS = C - 0.1*Math.abs(ratio - 1) - eta*D;
    if(milestoneStressFeedback.level>0) dS += 0.05*Math.sqrt(D);

    // dD/dt
    var dD = theta*Math.pow(ratio,2) - kappa*S - rho*D;

    // dx/dt
    var growth = S * x * (1 - x/Math.max(E,1e-10));
    growth *= 1/(1 + lambda*D);
    if(milestoneResonance.level>0 && ratio>0.95 && ratio<1.05) growth *= 2;

    // Integrate
    x += growth*dt;
    E += dE*dt;
    S += dS*dt;
    D += dD*dt;

    currency.value = BigNumber.from(x*dt).plus(currency.value);

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
}

function getPrimaryEquation() { return "\\dot{x} = Sx(1 - x/E) / (1 + \\lambda D)"; }
function getSecondaryEquation() { return "\\dot{E} = ax^{\\alpha} - bE"; }
function getTertiaryEquation() { return "S=" + S.toFixed(3) + "  D=" + D.toFixed(3); }

function getPublicationMultiplier(tau) { return tau**0.9; }
function getPublicationMultiplierFormula(symbol) { return symbol + "^{0.9}"; }
function getTau() { return Math.log10(Math.max(currency.value.toNumber(),1)); }
