import { CustomCost, ExponentialCost, FirstFreeCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { parseBigNumber, BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "adaptive_multi_regime";
var name = "Adaptive Multi-Regime Stability";
var description = "A self-organizing growth system with equilibrium, stability, and stress.";
var authors = "qrze, melon";
var version = 1.1;
var releaseOrder = "1";

requiresGameVersion("1.4.33");

var tauMultiplier = 4;

// Soft caps to prevent Infinity or negative x
var X_SOFTCAP = 1e6;    // soft max for x
var X_MIN = 1e-10;      // soft min for x

var x = BigNumber.ONE;
var E = BigNumber.ONE;
var S = 1;
var D = 0;

var a, b, c, alpha;
var milestoneResonance, milestoneEquilibriumBoost, milestoneStressFeedback;

var init = () => {
    currency = theory.createCurrency();

    /////////////////////////////
    // Regular Upgrades
    /////////////////////////////

    // a: equilibrium growth
    {
        let getDesc = (level) => "a = " + (0.1 + 0.05*level).toFixed(2);
        let getInfo = (level) => "a=" + (0.1 + 0.05*level).toFixed(2);
        a = theory.createUpgrade(0, currency, new ExponentialCost(5, 2));
        a.getDescription = (amount) => Utils.getMath(getDesc(a.level));
        a.getInfo = (amount) => Utils.getMathTo(getInfo(a.level), getInfo(a.level + amount));
    }

    // b: equilibrium decay reduction
    {
        let getDesc = (level) => "b = " + (0.05/(1 + level)).toFixed(3);
        let getInfo = (level) => "b=" + (0.05/(1 + level)).toFixed(3);
        b = theory.createUpgrade(1, currency, new ExponentialCost(10, 2.2));
        b.getDescription = (amount) => Utils.getMath(getDesc(b.level));
        b.getInfo = (amount) => Utils.getMathTo(getInfo(b.level), getInfo(b.level + amount));
    }

    // c: stability regeneration
    {
        let getDesc = (level) => "c = " + (0.05 + 0.03*level).toFixed(3);
        let getInfo = (level) => "c=" + (0.05 + 0.03*level).toFixed(3);
        c = theory.createUpgrade(2, currency, new ExponentialCost(20, 2.5));
        c.getDescription = (amount) => Utils.getMath(getDesc(c.level));
        c.getInfo = (amount) => Utils.getMathTo(getInfo(c.level), getInfo(c.level + amount));
    }

    // alpha: equilibrium exponent
    {
        let getDesc = (level) => "α = " + (1 + 0.02*level).toFixed(3);
        let getInfo = (level) => "α=" + (1 + 0.02*level).toFixed(3);
        alpha = theory.createUpgrade(3, currency, new ExponentialCost(50, 3));
        alpha.getDescription = (amount) => Utils.getMath(getDesc(alpha.level));
        alpha.getInfo = (amount) => Utils.getMathTo(getInfo(alpha.level), getInfo(alpha.level + amount));
    }

    /////////////////////////////
    // Milestones
    /////////////////////////////
    theory.setMilestoneCost(new LinearCost(10, 10));

    milestoneResonance = theory.createMilestoneUpgrade(0, 1);
    milestoneResonance.description = "Resonance doubles growth near x ≈ E";
    milestoneResonance.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();

    milestoneEquilibriumBoost = theory.createMilestoneUpgrade(1, 1);
    milestoneEquilibriumBoost.description = "Add log(x) to dE/dt";
    milestoneEquilibriumBoost.boughtOrRefunded = (_) => theory.invalidateSecondaryEquation();

    milestoneStressFeedback = theory.createMilestoneUpgrade(2, 1);
    milestoneStressFeedback.description = "Convert stress into stability";
    milestoneStressFeedback.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
}

var tick = (elapsedTime, multiplier) => {
    let dt = elapsedTime*multiplier;

    // Upgrade effects
    let A = 0.1 + 0.05*a.level;
    let B = 0.05 / (1 + b.level);
    let C = 0.05 + 0.03*c.level;
    let Alpha = 1 + 0.02*alpha.level;

    // Apply soft caps to x
    let xVal = Math.min(Math.max(x.toNumber(), X_MIN), X_SOFTCAP);
    let EVal = Math.max(E.toNumber(), 1e-10);
    let ratio = xVal / EVal;

    // dE/dt
    let dE = A * Math.pow(xVal, Alpha) - B * EVal;
    if (milestoneEquilibriumBoost.level > 0) dE += Math.log(xVal + 1);

    // dS/dt
    let dS = C - 0.1*Math.abs(ratio - 1) - 0.05*D;
    if (milestoneStressFeedback.level > 0) dS += 0.05*Math.sqrt(D);

    // dD/dt
    let dD = 0.1*Math.pow(ratio,2) - 0.1*S - 0.02*D;

    // dx/dt
    let growth = S * xVal * (1 - xVal/EVal);
    growth /= (1 + 0.05*D);
    if(milestoneResonance.level>0 && ratio>0.95 && ratio<1.05) growth *= 2;

    // Integrate with soft cap
    let newX = xVal + growth*dt;
    newX = Math.min(Math.max(newX, X_MIN), X_SOFTCAP);
    x = BigNumber.from(newX);

    E = BigNumber.from(EVal + dE*dt);
    S += dS*dt;
    D += dD*dt;

    // Fully loader-safe update
    currency.value = BigNumber.from(currency.value.toNumber() + x.toNumber()*dt);

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
}

var getPrimaryEquation = () => "\\dot{x} = Sx(1 - x/E) / (1 + λD)";
var getSecondaryEquation = () => "\\dot{E} = ax^α - bE";
var getTertiaryEquation = () => "S=" + S.toFixed(3) + ", D=" + D.toFixed(3);

init();
