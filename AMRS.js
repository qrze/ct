import { ExponentialCost, LinearCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "adaptive_multi_regime";
var name = "Adaptive Multi-Regime Stability";
var description = "A self-organizing growth system governed by equilibrium, stability, and stress.";
var authors = "qrze, melon";
var version = 1.2;

var currency;
var q = BigNumber.ONE;
var E = BigNumber.ONE;
var S = BigNumber.ONE;
var D = BigNumber.ZERO;

var a1, a2, c1, alpha;

var milestoneResonance, milestoneEquilibriumBoost, milestoneStressFeedback;

var lambda = 0.05;
var eta = 0.05;
var theta = 0.1;
var kappa = 0.1;
var rho = 0.02;

init();

function init() {

    currency = theory.createCurrency();

    ///////////////////
    // Regular Upgrades
    ///////////////////

    a1 = theory.createUpgrade(99, currency, new ExponentialCost(5, 2));
    a1.getDescription = () => "Increase equilibrium growth (a)";
    a1.getEffect = () => BigNumber.from(0.1 + 0.05 * a1.level);

    a2 = theory.createUpgrade(1, currency, new ExponentialCost(10, 2.2));
    a2.getDescription = () => "Reduce equilibrium decay (b)";
    a2.getEffect = () => BigNumber.from(0.05 / (1 + a2.level));

    c1 = theory.createUpgrade(2, currency, new ExponentialCost(20, 2.5));
    c1.getDescription = () => "Increase stability regen (c)";
    c1.getEffect = () => BigNumber.from(0.05 + 0.03 * c.level);

    alpha = theory.createUpgrade(3, currency, new ExponentialCost(50, 3));
    alpha.getDescription = () => "Increase equilibrium exponent (α)";
    alpha.getEffect = () => BigNumber.from(1 + 0.02 * alpha.level);

    ///////////////////
    // Milestones
    ///////////////////

    theory.setMilestoneCost(new LinearCost(10, 10));

    milestoneResonance = theory.createMilestoneUpgrade(0, 1);
    milestoneResonance.getDescription = () => "Unlock resonance band boost";

    milestoneEquilibriumBoost = theory.createMilestoneUpgrade(1, 1);
    milestoneEquilibriumBoost.getDescription = () => "Add log(x) to dE/dt";

    milestoneStressFeedback = theory.createMilestoneUpgrade(2, 1);
    milestoneStressFeedback.getDescription = () => "Convert stress into stability";

    updateAvailability();
}

function updateAvailability() {

    milestoneResonance.isAvailable = theory.milestonesTotal > 0;
    milestoneEquilibriumBoost.isAvailable = theory.milestonesTotal > 1;
    milestoneStressFeedback.isAvailable = theory.milestonesTotal > 2;
}

function tick(elapsedTime, multiplier) {

    let dt = BigNumber.from(elapsedTime * multiplier);

    let A = a1.getEffect();
    let B = a2.getEffect();
    let C = c1.getEffect();
    let Alpha = alpha.getEffect();

    let ratio = q.div(E.max(1e-10));

    ///////////////////
    // Differential System
    ///////////////////

    // dE/dt
    let dE = A.mul(q.pow(Alpha)).minus(B.mul(E));

    if (milestoneEquilibriumBoost.level > 0) {
        dE = dE.plus(BigNumber.ONE.plus(q).log());
    }

    // dS/dt
    let dS = C.minus(ratio.minus(1).abs().mul(0.1)).minus(D.mul(eta));

    if (milestoneStressFeedback.level > 0) {
        dS = dS.plus(D.sqrt().mul(0.05));
    }

    // dD/dt
    let dD = ratio.pow(2).mul(theta).minus(S.mul(kappa)).minus(D.mul(rho));

    // dx/dt
    let growth = S.mul(q).mul(BigNumber.ONE.minus(q.div(E.max(1e-10))));
    growth = growth.mul(BigNumber.from(Math.exp(-lambda * D.toNumber())));

    if (milestoneResonance.level > 0) {
        if (ratio.gt(0.95) && ratio.lt(1.05)) {
            growth = growth.mul(2);
        }
    }

    ///////////////////
    // Integration
    ///////////////////

    q = q.plus(growth.mul(dt)).max(1);
    E = E.plus(dE.mul(dt)).max(1);
    S = S.plus(dS.mul(dt)).max(0);
    D = D.plus(dD.mul(dt)).max(0);

    currency.value = currency.value.plus(q.mul(dt));

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
}

function getPrimaryEquation() {
    return "\\dot{x} = Sx(1 - x/E)e^{-\\lambda D}";
}

function getSecondaryEquation() {
    return "\\dot{E} = ax^{\\alpha} - bE";
}

function getTertiaryEquation() {
    return "S=" + S.toString(3) + " \\quad D=" + D.toString(3);
}

function getPublicationMultiplier(tau) {
    return tau.pow(0.9);
}

function getPublicationMultiplierFormula(symbol) {
    return symbol + "^{0.9}";
}

function getTau() {
    return currency.value.max(1).log10();
}

init();
