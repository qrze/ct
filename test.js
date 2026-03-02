var id = "adaptive_multi_regime";
var name = "Adaptive Multi-Regime Stability";
var description = "A self-organizing growth system with equilibrium, stability, and stress.";
var authors = "qrze, melon";
var version = 1;

var currency;
var x = BigNumber.ONE;
var E = BigNumber.ONE;
var S = BigNumber.ONE;
var D = BigNumber.ZERO;

// Upgrade placeholders
var a, b, c, alpha;
var a_level = 0;
var b_level = 0;
var c_level = 0;
var alpha_level = 0;

// Milestones placeholders
var milestoneResonance, milestoneEquilibriumBoost, milestoneStressFeedback;

// Constants
var lambda = BigNumber.from(0.05);
var eta = BigNumber.from(0.05);
var theta = BigNumber.from(0.1);
var kappa = BigNumber.from(0.1);
var rho = BigNumber.from(0.02);

var ratio = BigNumber.ZERO;

function init() {
    currency = theory.createCurrency();

    // Upgrades
    a = theory.createUpgrade(0, currency, new ExponentialCost(5,2));
    a.onBuy = function() { a_level++; };

    b = theory.createUpgrade(1, currency, new ExponentialCost(10,2.2));
    b.onBuy = function() { b_level++; };

    c = theory.createUpgrade(2, currency, new ExponentialCost(20,2.5));
    c.onBuy = function() { c_level++; };

    alpha = theory.createUpgrade(3, currency, new ExponentialCost(50,3));
    alpha.onBuy = function() { alpha_level++; };

    // Milestones
    theory.setMilestoneCost(new LinearCost(10,10));
    milestoneResonance = theory.createMilestoneUpgrade(0,1);
    milestoneEquilibriumBoost = theory.createMilestoneUpgrade(1,1);
    milestoneStressFeedback = theory.createMilestoneUpgrade(2,1);
}

function tick(elapsedTime, multiplier) {
    var dt = BigNumber.from(elapsedTime*multiplier);

    // Upgrade effects
    var A = BigNumber.from(0.1).plus(BigNumber.from(0.05).times(a_level));
    var B = BigNumber.from(0.05).div(BigNumber.ONE.plus(BigNumber.from(b_level)));
    var C = BigNumber.from(0.05).plus(BigNumber.from(0.03).times(c_level));
    var Alpha = BigNumber.ONE.plus(BigNumber.from(0.02).times(alpha_level));

    // Compute ratio safely
    ratio = x.times(BigNumber.ONE.div(E.max(BigNumber.from(1e-10))));

    // dE/dt
    var dE = A.times(x.pow(Alpha)).minus(B.times(E));
    if(milestoneEquilibriumBoost.level>0) {
        dE = dE.plus(BigNumber.ONE.plus(x).log());
    }

    // dS/dt
    var dS = C.minus(ratio.minus(BigNumber.ONE).abs().times(BigNumber.from(0.1))).minus(D.times(eta));
    if(milestoneStressFeedback.level>0) {
        dS = dS.plus(D.sqrt().times(BigNumber.from(0.05)));
    }

    // dD/dt
    var dD = ratio.pow(BigNumber.from(2)).times(theta).minus(S.times(kappa)).minus(D.times(rho));

    // dx/dt
    var growth = S.times(x).times(BigNumber.ONE.minus(x.times(BigNumber.ONE.div(E.max(BigNumber.from(1e-10))))));
    growth = growth.times(BigNumber.ONE.div(BigNumber.ONE.plus(D.times(lambda))));
    if(milestoneResonance.level>0) {
        if(ratio.gt(BigNumber.from(0.95)) && ratio.lt(BigNumber.from(1.05))) growth = growth.times(BigNumber.from(2));
    }

    // Integrate
    x = x.plus(growth.times(dt)).max(BigNumber.ONE);
    E = E.plus(dE.times(dt)).max(BigNumber.ONE);
    S = S.plus(dS.times(dt)).max(BigNumber.ZERO);
    D = D.plus(dD.times(dt)).max(BigNumber.ZERO);

    currency.value = currency.value.plus(x.times(dt));

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
}

function getPrimaryEquation() { return "\\dot{x} = Sx(1 - x/E) / (1 + \\lambda D)"; }
function getSecondaryEquation() { return "\\dot{E} = ax^{\\alpha} - bE"; }
function getTertiaryEquation() { return "S=" + S.toString(3) + "  D=" + D.toString(3); }

function getPublicationMultiplier(tau) { return tau.pow(0.9); }
function getPublicationMultiplierFormula(symbol) { return symbol + "^{0.9}"; }
function getTau() { return currency.value.max(BigNumber.ONE).log10(); }
