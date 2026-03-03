import { ExponentialCost } from "./api/Costs";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "adaptive_multi_regime";
var name = "Adaptive Multi-Regime Stability";
var description = "Stable equilibrium growth with smooth resonance dynamics.";
var authors = "qrze, melon";
var version = 3.2;

requiresGameVersion("1.4.33");

var tauMultiplier = 4;

var currency;
var tauCurrency;

var X_SOFTCAP = 1e1100;
var E_SOFTCAP = 1e500;
var X_MIN = 1;
var E_MIN = 1;
var D_MIN = 0.1;

var x = BigNumber.ONE;
var E = BigNumber.ONE;
var S = 1.1;
var D = 0;

var a, b, c, alpha;
var milestoneResonance, milestoneEquilibriumBoost, milestoneStressFeedback;
var milestoneExplosion;

var init = () =>
{
    currency = theory.createCurrency();
    tauCurrency = theory.createCurrency("τ", "\\tau");

    a = theory.createUpgrade(0, currency, new ExponentialCost(5, 2));
    a.getDescription = (_) => Utils.getMath("a = " + (0.1 + 0.05*a.level).toFixed(2));
    a.getInfo = (amt) => Utils.getMath("a = " + (0.1 + 0.05*(a.level + amt)).toFixed(2));

    b = theory.createUpgrade(1, currency, new ExponentialCost(10, 2.2));
    b.getDescription = (_) => Utils.getMath("b = " + (0.05/(1 + b.level)).toFixed(3));
    b.getInfo = (amt) => Utils.getMath("b = " + (0.05/(1 + b.level + amt)).toFixed(3));

    c = theory.createUpgrade(2, currency, new ExponentialCost(20, 2.5));
    c.getDescription = (_) => Utils.getMath("c = " + (0.05 + 0.03*c.level).toFixed(3));
    c.getInfo = (amt) => Utils.getMath("c = " + (0.05 + 0.03*(c.level + amt)).toFixed(3));

    alpha = theory.createUpgrade(3, currency, new ExponentialCost(50, 3));
    alpha.getDescription = (_) => Utils.getMath("α = " + (1 + 0.02*alpha.level).toFixed(3));
    alpha.getInfo = (amt) => Utils.getMath("α = " + (1 + 0.02*(alpha.level + amt)).toFixed(3));

    theory.createPublicationUpgrade(0, currency, 1e8);
    theory.createBuyAllUpgrade(1, currency, 1e15);
    theory.createAutoBuyerUpgrade(2, currency, 1e25);

    milestoneResonance = theory.createMilestoneUpgrade(0, 1);
    milestoneResonance.description = "Resonance doubles growth near equilibrium";

    milestoneEquilibriumBoost = theory.createMilestoneUpgrade(1, 1);
    milestoneEquilibriumBoost.description = "Add log(x) to dE/dt";

    milestoneStressFeedback = theory.createMilestoneUpgrade(2, 1);
    milestoneStressFeedback.description = "Convert stress into stability";

    milestoneExplosion = theory.createMilestoneUpgrade(3, 1);
    milestoneExplosion.description = "Smooth τ resonance";
};

var tick = (elapsedTime, multiplier) =>
{
    let dt = elapsedTime * multiplier;

    let A = 0.1 + 0.05*a.level;
    let B = 0.05 / (1 + b.level);
    let C = 0.05 + 0.03*c.level;
    let Alpha = 1 + 0.02*alpha.level;

    let xVal = Math.min(Math.max(x.toNumber(), X_MIN), X_SOFTCAP);
    let EVal = Math.min(Math.max(E.toNumber(), E_MIN), E_SOFTCAP);
    let ratio = Math.max(1e-5, xVal / EVal);

    if (xVal < 50)
        S += 0.1 * dt;

    let dE = A * Math.pow(xVal, Alpha) - B * EVal;

    if (milestoneEquilibriumBoost.level > 0)
        dE += Math.log(xVal + 1);

    let dS = C - 0.1*Math.abs(ratio - 1) - 0.05*D;

    if (milestoneStressFeedback.level > 0)
        dS += 0.05*Math.sqrt(D);

    let dD = 0.1*Math.pow(ratio,2) - 0.1*S - 0.003*D;

    D += dD * dt;
    if (D < D_MIN)
        D = D_MIN;

    let growth = Math.max(0.02, S * xVal * (1 - xVal/EVal));
    growth /= (1 + 0.05*D);

    if (milestoneResonance.level > 0 && ratio > 0.95 && ratio < 1.05)
        growth *= 2;

    let xval = Math.main(Math.max(x.toNumber(), X_MIN), X_ SOFTCAP);
    let Eval = Math.main(Math.max(E.toNumber(), E_MIN), E_ SOFTCAP);
    let ratio = Math.main(1e-5,xval / Eval);
    S += dS * dt;

    currency.value += x * BigNumber.from(dt);

    // =============
    // TAU EXPLOSION
    // =============

    let tauBase = currency.value.max(BigNumber.ONE).pow(0.18);
    let tauFinal = tauBase;

    if (milestoneExplosion.level > 0)
{
    let logTau = tauBase.log10().toNumber();

    let center = 250;
    let width = 80;
    let peakStrength = 25;

    let pubFuel = 1 + Math.sqrt(theory.publicationCount) * 0.02;

    let dist = (logTau - center) / width;

    // Gaussian but bounded
    let resonance = Math.exp(-dist * dist);

    // Soft scaling instead of exponential explosion
    let additiveBoost = peakStrength * resonance * pubFuel;

    // Add to log-space instead of multiplying huge powers
    let newLogTau = logTau + additiveBoost;
    newLogTau = Math.min(newLogTau, 308);
    tauFinal = BigNumber.from(10).pow(newLogTau);
    // Smoothly cap the growth
    if (newLogTau > 300) {
        newLogTau = 300 + Math.log10(1 + (newLogTau - 300) * 0.1);
    }

    tauFinal = BigNumber.from(10).pow(newLogTau);
}

    tauCurrency.value = tauFinal;

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
};

var getPrimaryEquation = () =>
    "\\dot{x} = \\frac{Sx(1 - x/E)}{1+\\lambda D}";

var getSecondaryEquation = () =>
    "\\dot{E} = ax^\\alpha - bE";

var getTertiaryEquation = () =>
    "S=" + S.toFixed(2) + ", D=" + D.toFixed(2);

var getPublicationMultiplier = (tau) =>
    tau.pow(0.85);

var getPublicationFormula = () =>
    "\\tau = \\rho^{0.18}";

init();
