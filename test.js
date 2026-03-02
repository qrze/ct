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

var a = BigNumber.ZERO;
var b = BigNumber.ZERO;
var c = BigNumber.ZERO;
var alpha = BigNumber.ZERO;

var milestoneResonance = BigNumber.ZERO;
var milestoneEquilibriumBoost = BigNumber.ZERO;
var milestoneStressFeedback = BigNumber.ZERO;

var lambda = 0.05;
var eta = 0.05;
var theta = 0.1;
var kappa = 0.1;
var rho = 0.02;

function init() {
    currency = theory.createCurrency();

    a = theory.createUpgrade(0, currency, new ExponentialCost(5,2));
    b = theory.createUpgrade(1, currency, new ExponentialCost(10,2.2));
    c = theory.createUpgrade(2, currency, new ExponentialCost(20,2.5));
    alpha = theory.createUpgrade(3, currency, new ExponentialCost(50,3));

    theory.setMilestoneCost(new LinearCost(10,10));
    milestoneResonance = theory.createMilestoneUpgrade(0,1);
    milestoneEquilibriumBoost = theory.createMilestoneUpgrade(1,1);
    milestoneStressFeedback = theory.createMilestoneUpgrade(2,1);
}

function tick(elapsedTime, multiplier) {
    var dt = BigNumber.from(elapsedTime*multiplier);

    var A = BigNumber.from(0.1 + 0.05 * a.level);
    var B = BigNumber.from(0.05 / (1 + b.level));
    var C = BigNumber.from(0.05 + 0.03 * c.level);
    var Alpha = BigNumber.from(1 + 0.02 * alpha.level);

    var ratio = x.div(E.max(1e-10));

    // dE/dt
    var dE = A.mul(x.pow(Alpha)).minus(B.mul(E));
    if(milestoneEquilibriumBoost.level>0) dE = dE.plus(BigNumber.ONE.plus(x).log());

    // dS/dt
    var dS = C.minus(ratio.minus(1).abs().mul(0.1)).minus(D.mul(eta));
    if(milestoneStressFeedback.level>0) dS = dS.plus(D.sqrt().mul(0.05));

    // dD/dt
    var dD = ratio.pow(2).mul(theta).minus(S.mul(kappa)).minus(D.mul(rho));

    // dx/dt
    var growth = S.mul(x).mul(BigNumber.ONE.minus(x.div(E.max(1e-10))));
    growth = growth.mul(BigNumber.ONE.div(BigNumber.ONE.plus(D.mul(lambda))));
    if(milestoneResonance.level>0) {
        if(ratio.gt(0.95) && ratio.lt(1.05)) growth = growth.mul(2);
    }

    x = x.plus(growth.mul(dt)).max(1);
    E = E.plus(dE.mul(dt)).max(1);
    S = S.plus(dS.mul(dt)).max(0);
    D = D.plus(dD.mul(dt)).max(0);

    currency.value = currency.value.plus(x.mul(dt));

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
}

function getPrimaryEquation() { return "\\dot{x} = Sx(1 - x/E) / (1 + \\lambda D)"; }
function getSecondaryEquation() { return "\\dot{E} = ax^{\\alpha} - bE"; }
function getTertiaryEquation() { return "S=" + S.toString(3) + "  D=" + D.toString(3); }

function getPublicationMultiplier(tau) { return tau.pow(0.9); }
function getPublicationMultiplierFormula(symbol) { return symbol + "^{0.9}"; }
function getTau() { return currency.value.max(1).log10(); }

init();
