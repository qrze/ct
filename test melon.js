import { ExponentialCost } from "./api/Costs";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "adaptive_multi_regime";
var name = "Adaptive Multi-Regime Stability";
var description = "Stable equilibrium growth with smooth resonance dynamics.";
var authors = "qrze, melon";
var version = 3.7;

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

var a1, a2, c1, c2, alpha;
var milestoneResonance, milestoneEquilibriumBoost, milestoneStressFeedback;
var milestoneExplosion;

var init = () =>
{
    currency = theory.createCurrency();
    tauCurrency = theory.createCurrency("τ", "\\tau");

    // a1
    a1 = theory.createUpgrade(0, currency, new ExponentialCost(5, 2));
    a1.getDescription = (_) => Utils.getMath("a_1 = " + (0.1 + 0.05*a1.level).toFixed(2));
    a1.getInfo = (amt) => Utils.getMath("a_1 = " + (0.1 + 0.05*(a1.level + amt)).toFixed(2));

    // a2
    a2 = theory.createUpgrade(1, currency, new ExponentialCost(10, 2.2));
    a2.getDescription = (_) => Utils.getMath("a_2 = " + (0.05/(1 + a2.level)).toFixed(3));
    a2.getInfo = (amt) => Utils.getMath("a_2 = " + (0.05/(1 + a2.level + amt)).toFixed(3));

    // c1
    c1 = theory.createUpgrade(2, currency, new ExponentialCost(20, 2.5));
    c1.getDescription = (_) => Utils.getMath("c_1 = " + (0.05 + 0.03*c1.level).toFixed(3));
    c1.getInfo = (amt) => Utils.getMath("c_1 = " + (0.05 + 0.03*(c1.level + amt)).toFixed(3));

    // c2
    c2 = theory.createUpgrade(4, currency, new ExponentialCost(1e10, 1e5));
    c2.getDescription = (_) => Utils.getMath("c_2 = " + c2.level + " (×2 income)");
    c2.getInfo = (amt) => Utils.getMath("Income ×2^{" + (c2.level + amt) + "}");

    // alpha
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

    let A = 0.1 + 0.05*a1.level;
    let B = 0.05 / (1 + a2.level);
    let C = 0.05 + 0.03*c1.level;
    let Alpha = 1 + 0.02*alpha.level;

    let beta = BigNumber.from(2).pow(c2.level); // NEW

    let xVal = x.toNumber();
    let EVal = E.toNumber();
    let ratio = Math.max(1e-50, xVal / EVal);

    // Milestone Equations
    let dE = A * Math.pow(xVal, Alpha) - B * EVal;

    if (milestoneEquilibriumBoost.level > 0)
        dE += Math.log(xVal + 1);

    let dS = C - 0.05*Math.abs(ratio-1);

    if (milestoneStressFeedback.level > 0)
        dS += 0.05*Math.sqrt(D);

    let dD = 0.1*Math.pow(ratio,2) - 0.1*S - 0.003*D;

    D += dD * dt;
    if (D < D_MIN) D = D_MIN;

    let growth = Math.max(0.02, S * xVal * (1 - xVal/EVal));

    if (milestoneResonance.level > 0 && ratio > 0.95 && ratio < 1.05)
        growth *= 2;

    x += growth * dt;
    E += dE * dt;
    S += dS * dt;

    // Currency income with c2 multiplier
    currency.value += x * beta * BigNumber.from(dt);

    // Tau base
    let tauBase = currency.value.max(BigNumber.ONE).pow(0.18);
    tauCurrency.value = tauBase;

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
};

// PERSIST STATE
var getInternalState = () =>
    [x.toString(), E.toString(), S.toString(), D.toString()].join(" ");

var setInternalState = (state) => {
    let v = state.split(" ");
    if (v.length >= 4) {
        x = BigNumber.from(v[0]);
        E = BigNumber.from(v[1]);
        S = parseFloat(v[2]);
        D = parseFloat(v[3]);
    }
};

var getPrimaryEquation = () =>
    "\\dot{x} = \\frac{Sx(1 - x/E)}{1+\\lambda D}";

var getSecondaryEquation = () =>
    "\\dot{E} = a_1 x^{\\alpha} - a_2 E \\\\ \\beta = c_2";

var getTertiaryEquation = () =>
    "S=" + S.toFixed(2) + ", D=" + D.toFixed(2);

var getPublicationMultiplier = (tau) =>
    tau.pow(0.85);

var getPublicationFormula = () =>
    "\\tau = \\rho^{0.18}";

init();
