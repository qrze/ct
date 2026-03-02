import { ExponentialCost, LinearCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "adaptive_multi_regime";
var name = "Adaptive Multi-Regime Stability";
var description = "A self-organizing growth system governed by equilibrium, stability, and stress.";
var authors = "qrze, melon";
var version = 1.1;

var currency;
var x = BigNumber.ONE;
var E = BigNumber.ONE;
var S = BigNumber.ONE;
var D = BigNumber.ZERO;

var a, b, c, alpha;

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

    a = theory.createUpgrade(0, currency, new ExponentialCost(5, 2));
    a.getDescription = () => "Increase equilibrium growth (a)";
    a.getEffect = () => BigNumber.from(0.1 + 0.05 * a.level);

    b = theory.createUpgrade(1, currency, new ExponentialCost(10, 2.2));
    b.getDescription = () => "Reduce equilibrium decay (b)";
    b.getEffect = () => BigNumber.from(0.05 / (1 + b.level));

    c = theory.createUpgrade(2, currency, new ExponentialCost(20, 2.5));
    c.getDescription = () => "Increase stability regen (c)";
    c.getEffect = () => BigNumber.from(0.05 + 0.03 * c.level);

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

function tick(function tick(elapsedTime, multiplier) {

    let dt = BigNumber.from(elapsedTime * multiplier);

    // Compute upgrade effects manually from level
    let A = BigNumber.from(0.1 + 0.05 * a.level);
    let B = BigNumber.from(0.05 / (1 + b.level));
    let C = BigNumber.from(0.05 + 0.03 * c.level);
    let Alpha = BigNumber.from(1 + 0.02 * alpha.level);

    let ratio = x.div(E.max(1e-10));

    // dE/dt
    let dE = A.mul(x.pow(Alpha)).minus(B.mul(E));

    if (milestoneEquilibriumBoost.level > 0) {
        dE = dE.plus(BigNumber.ONE.plus(x).log());
    }

    // dS/dt
    let dS = C.minus(ratio.minus(1).abs().mul(0.1)).minus(D.mul(eta));

    if (milestoneStressFeedback.level > 0) {
        dS = dS.plus(D.sqrt().mul(0.05));
    }

    // dD/dt
    let dD = ratio.pow(2).mul(theta).minus(S.mul(kappa)).minus(D.mul(rho));

    // dx/dt
    let growth = S.mul(x).mul(BigNumber.ONE.minus(x.div(E.max(1e-10))));

    // IMPORTANT: Avoid Math.exp with BigNumber
    let stressFactor = BigNumber.ONE.div(BigNumber.ONE.plus(D.mul(lambda)));
    growth = growth.mul(stressFactor);

    if (milestoneResonance.level > 0) {
        if (ratio.gt(0.95) && ratio.lt(1.05)) {
            growth = growth.mul(2);
        }
    }

    // Integrate
    x = x.plus(growth.mul(dt)).max(1);
    E = E.plus(dE.mul(dt)).max(1);
    S = S.plus(dS.mul(dt)).max(0);
    D = D.plus(dD.mul(dt)).max(0);

    currency.value = currency.value.plus(x.mul(dt));

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
}) {

    let dt = BigNumber.from(elapsedTime * multiplier);

    let A = a.getEffect();
    let B = b.getEffect();
    let C = c.getEffect();
    let Alpha = alpha.getEffect();

    let ratio = x.div(E.max(1e-10));

    ///////////////////
    // Differential System
    ///////////////////

    // dE/dt
    let dE = A.mul(x.pow(Alpha)).minus(B.mul(E));

    if (milestoneEquilibriumBoost.level > 0) {
        dE = dE.plus(BigNumber.ONE.plus(x).log());
    }

    // dS/dt
    let dS = C.minus(ratio.minus(1).abs().mul(0.1)).minus(D.mul(eta));

    if (milestoneStressFeedback.level > 0) {
        dS = dS.plus(D.sqrt().mul(0.05));
    }

    // dD/dt
    let dD = ratio.pow(2).mul(theta).minus(S.mul(kappa)).minus(D.mul(rho));

    // dx/dt
    let growth = S.mul(x).mul(BigNumber.ONE.minus(x.div(E.max(1e-10))));
    growth = growth.mul(BigNumber.from(Math.exp(-lambda * D.toNumber())));

    if (milestoneResonance.level > 0) {
        if (ratio.gt(0.95) && ratio.lt(1.05)) {
            growth = growth.mul(2);
        }
    }

    ///////////////////
    // Integration
    ///////////////////

    x = x.plus(growth.mul(dt)).max(1);
    E = E.plus(dE.mul(dt)).max(1);
    S = S.plus(dS.mul(dt)).max(0);
    D = D.plus(dD.mul(dt)).max(0);

    currency.value = currency.value.plus(x.mul(dt));

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
