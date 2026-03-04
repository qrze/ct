import { ExponentialCost } from "./api/Costs";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "adaptive_multi_regime";
var name = "Adaptive Multi-Regime Stability";
var description = "Stable equilibrium growth with smooth resonance dynamics.";
var authors = "qrze, melon";
var version = 4.4;

requiresGameVersion("1.4.33");

var currency, tauCurrency;

var x = BigNumber.ONE;
var E = BigNumber.ONE;
var S = 1.1;
var D = 0;

var a1, a2, c1, c2, alpha;
var milestoneResonance, milestoneEquilibriumBoost, milestoneStressFeedback;

var init = () =>
{
    currency = theory.createCurrency();
    tauCurrency = theory.createCurrency("τ", "\\tau");

    // a1
    a1 = theory.createUpgrade(0, currency, new ExponentialCost(5, 2));
    a1.getDescription = _ => Utils.getMath("a_1 = " + (0.1 + 0.05*a1.level).toFixed(2));

    // a2
    a2 = theory.createUpgrade(1, currency, new ExponentialCost(10, 2.2));
    a2.getDescription = _ => Utils.getMath("a_2 = " + (0.05/(1 + a2.level)).toFixed(3));

    // c1
    c1 = theory.createUpgrade(2, currency, new ExponentialCost(20, 2.5));
    c1.getDescription = _ => Utils.getMath("c_1 = " + (0.05 + 0.03*c1.level).toFixed(3));

    // alpha
    alpha = theory.createUpgrade(3, currency, new ExponentialCost(50, 3));
    alpha.getDescription = _ => Utils.getMath("α = " + (1 + 0.02*alpha.level).toFixed(3));

    // c2 (β upgrade)
    c2 = theory.createUpgrade(
        4,
        currency,
        new ExponentialCost(1e10, BigNumber.from(1e5))
    );
    c2.getDescription = _ => Utils.getMath("c_2 = 1.5^{" + c2.level + "}");

    theory.createPublicationUpgrade(0, currency, 1e8);
    theory.createBuyAllUpgrade(1, currency, 1e15);
    theory.createAutoBuyerUpgrade(2, currency, 1e25);

    milestoneResonance = theory.createMilestoneUpgrade(0, 1);
    milestoneResonance.description = "Double growth near equilibrium";

    milestoneEquilibriumBoost = theory.createMilestoneUpgrade(1, 1);
    milestoneEquilibriumBoost.description = "Add log(x) to dE/dt";

    milestoneStressFeedback = theory.createMilestoneUpgrade(2, 1);
    milestoneStressFeedback.description = "Convert stress into stability";
};

var tick = (elapsedTime, multiplier) =>
{
    let dt = BigNumber.from(elapsedTime * multiplier);

    let A = 0.1 + 0.05*a1.level;
    let B = 0.05 / (1 + a2.level);
    let C = 0.05 + 0.03*c1.level;
    let Alpha = 1 + 0.02*alpha.level;

    let beta = BigNumber.from(1.5).pow(c2.level); // β = exact c2 value

    let xVal = x.toNumber();
    let EVal = E.toNumber();
    let ratio = Math.max(1e-50, xVal / EVal);

    // dE
    let dE = A * Math.pow(xVal, Alpha) - B * EVal;
    if (milestoneEquilibriumBoost.level > 0)
        dE += Math.log(xVal + 1);

    // dS
    let dS = C - 0.05*Math.abs(ratio-1);
    if (milestoneStressFeedback.level > 0)
        dS += 0.05*Math.sqrt(D);

    // dD
    let dD = 0.1*Math.pow(ratio,2) - 0.1*S - 0.003*D;
    D += dD * elapsedTime;
    if (D < 0.1) D = 0.1;

    // x growth
    let baseGrowth = Math.max(0.02, S * xVal * (1 - xVal/EVal));

    if (milestoneResonance.level > 0 && ratio > 0.95 && ratio < 1.05)
        baseGrowth *= 2;

    let growth = beta.toNumber() * baseGrowth;

    x = x.plus(BigNumber.from(growth).times(elapsedTime));
    E = E.plus(BigNumber.from(dE).times(elapsedTime));
    S += dS * elapsedTime;

    currency.value = currency.value.plus(
    x.times(dt)
);

    tauCurrency.value = currency.value.max(BigNumber.ONE).pow(0.18);

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
};

// Persistent State
var getInternalState = () =>
    [x.toString(), E.toString(), S.toString(), D.toString()].join(" ");

var setInternalState = (state) =>
{
    let v = state.split(" ");
    if (v.length >= 4)
    {
        x = BigNumber.from(v[0]);
        E = BigNumber.from(v[1]);
        S = parseFloat(v[2]);
        D = parseFloat(v[3]);
    }
};

// Equations
var getPrimaryEquation = () =>
    "\\dot{x} = \\beta \\frac{Sx(1 - x/E)}{1+\\delta D}";

var getSecondaryEquation = () =>
    "\\dot{E} = a_1 x^{\\alpha} - a_2 E \\\\ \\beta = c_2";

var getTertiaryEquation = () =>
    "S=" + S.toFixed(2) + ", D=" + D.toFixed(2);

var getPublicationMultiplier = tau =>
    tau.pow(0.85);

var getPublicationFormula = () =>
    "\\tau = \\rho^{0.18}";

init();
