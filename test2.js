import { ExponentialCost } from "./api/Costs";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "adaptive_multi_regime";
var name = "Adaptive Multi-Regime Stability";
var description = "Stable equilibrium growth with stress dynamics.";
var authors = "qrze, melon";
var version = 2;

requiresGameVersion("1.4.33");

var X_SOFTCAP = 1e6;
var E_SOFTCAP = 1e6;
var X_MIN = 1e-10;
var E_MIN = 1e-10;
var D_MIN = 0.1;

var x = BigNumber.ONE;
var E = BigNumber.ONE;
var S = 1;
var D = 0;

var a, b, c, alpha;
var milestoneResonance, milestoneEquilibriumBoost, milestoneStressFeedback;

var init = () => {

    currency = theory.createCurrency();

    // a
    {
        a = theory.createUpgrade(0, currency, new ExponentialCost(5, 2));
        a.getDescription = (_) => Utils.getMath("a = " + (0.1 + 0.05*a.level).toFixed(2));
        a.getInfo = (amount) => Utils.getMath("a = " + (0.1 + 0.05*(a.level + amount)).toFixed(2));
    }

    // b
    {
        b = theory.createUpgrade(1, currency, new ExponentialCost(10, 2.2));
        b.getDescription = (_) => Utils.getMath("b = " + (0.05/(1 + b.level)).toFixed(3));
        b.getInfo = (amount) => Utils.getMath("b = " + (0.05/(1 + b.level + amount)).toFixed(3));
    }

    // c
    {
        c = theory.createUpgrade(2, currency, new ExponentialCost(20, 2.5));
        c.getDescription = (_) => Utils.getMath("c = " + (0.05 + 0.03*c.level).toFixed(3));
        c.getInfo = (amount) => Utils.getMath("c = " + (0.05 + 0.03*(c.level + amount)).toFixed(3));
    }

    // alpha
    {
        alpha = theory.createUpgrade(3, currency, new ExponentialCost(50, 3));
        alpha.getDescription = (_) => Utils.getMath("α = " + (1 + 0.02*alpha.level).toFixed(3));
        alpha.getInfo = (amount) => Utils.getMath("α = " + (1 + 0.02*(alpha.level + amount)).toFixed(3));
    }

    // Permanent upgrades
    theory.createPublicationUpgrade(0, currency, 1e8);
    theory.createBuyAllUpgrade(1, currency, 1e15);
    theory.createAutoBuyerUpgrade(2, currency, 1e25);

    // Milestones (default cost — avoids LinearCost parse issues)
    milestoneResonance = theory.createMilestoneUpgrade(0, 1);
    milestoneResonance.description = "Resonance doubles growth near equilibrium";

    milestoneEquilibriumBoost = theory.createMilestoneUpgrade(1, 1);
    milestoneEquilibriumBoost.description = "Add log(x) to dE/dt";

    milestoneStressFeedback = theory.createMilestoneUpgrade(2, 1);
    milestoneStressFeedback.description = "Convert stress into stability";
};

var tick = (elapsedTime, multiplier) => {

    let dt = elapsedTime * multiplier;

    let A = 0.1 + 0.05*a.level;
    let B = 0.05 / (1 + b.level);
    let C = 0.05 + 0.03*c.level;
    let Alpha = 1 + 0.02*alpha.level;

    let xVal = Math.min(Math.max(x.toNumber(), X_MIN), X_SOFTCAP);
    let EVal = Math.min(Math.max(E.toNumber(), E_MIN), E_SOFTCAP);
    let ratio = Math.max(1e-5, xVal / EVal);

    if (xVal < 10)
        S += 0.05;

    let dE = A * Math.pow(xVal, Alpha) - B * EVal;
    if (milestoneEquilibriumBoost.level > 0)
        dE += Math.log(xVal + 1);

    let dS = C - 0.1*Math.abs(ratio - 1) - 0.05*D;
    if (milestoneStressFeedback.level > 0)
        dS += 0.05*Math.sqrt(D);

    let dD = 0.1*Math.pow(ratio,2) - 0.1*S - 0.005*D;
    D += dD * dt;
    if (D < D_MIN)
        D = D_MIN;

    let growth = Math.max(0.01, S * xVal * (1 - xVal/EVal));
    growth /= (1 + 0.05*D);

    if (milestoneResonance.level > 0 && ratio > 0.95 && ratio < 1.05)
        growth *= 2;

    x = BigNumber.from(Math.min(Math.max(xVal + growth*dt, X_MIN), X_SOFTCAP));
    E = BigNumber.from(Math.min(Math.max(EVal + dE*dt, E_MIN), E_SOFTCAP));
    S += dS * dt;

    currency.value = BigNumber.from(currency.value.toNumber() + x.toNumber()*dt);

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
};

var getPrimaryEquation = () => "\\dot{x} = Sx(1 - x/E)/(1+λD)";
var getSecondaryEquation = () => "\\dot{E} = ax^α - bE";
var getTertiaryEquation = () => "S=" + S.toFixed(2) + ", D=" + D.toFixed(2);

init();        c.getDescription = (amount) => Utils.getMath(getDesc(c.level));
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
    // Permanent Upgrades
    /////////////////////////////
    theory.createPublicationUpgrade(0, currency, 1e8);
    theory.createBuyAllUpgrade(1, currency, 1e15);
    theory.createAutoBuyerUpgrade(2, currency, 1e25);

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

    // Soft clamp
    let xVal = Math.min(Math.max(x.toNumber(), X_MIN), X_SOFTCAP);
    let EVal = Math.min(Math.max(E.toNumber(), E_MIN), E_SOFTCAP);
    let ratio = Math.max(1e-5, xVal / EVal);

    // Early-game boost for S
    if (xVal < 10) S += 0.05;

    // dE/dt
    let dE = A * Math.pow(xVal, Alpha) - B * EVal;
    if (milestoneEquilibriumBoost.level > 0) dE += Math.log(xVal + 1);

    // dS/dt
    let dS = C - 0.1*Math.abs(ratio - 1) - 0.05*D;
    if (milestoneStressFeedback.level > 0) dS += 0.05*Math.sqrt(D);

    // dD/dt with slower decay
    let dD = 0.1*Math.pow(ratio,2) - 0.1*S - 0.005*D;
    D += dD*dt;
    D = Math.max(D, D_MIN); // floor to prevent soft-lock

    // dx/dt with minimal base growth
    let growth = Math.max(0.01, S * xVal * (1 - xVal/EVal));
    growth /= (1 + 0.05*D);
    if(milestoneResonance.level>0 && ratio>0.95 && ratio<1.05) growth *= 2;

    // Integrate with soft caps
    x = BigNumber.from(Math.min(Math.max(xVal + growth*dt, X_MIN), X_SOFTCAP));
    E = BigNumber.from(Math.min(Math.max(EVal + dE*dt, E_MIN), E_SOFTCAP));
    S += dS*dt;

    // Loader-safe currency update
    currency.value = BigNumber.from(currency.value.toNumber() + x.toNumber()*dt);

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
}

var getPrimaryEquation = () => "\\dot{x} = Sx(1 - x/E) / (1 + λD)";
var getSecondaryEquation = () => "\\dot{E} = ax^α - bE";
var getTertiaryEquation = () => "S=" + S.toFixed(3) + ", D=" + D.toFixed(3);

init();        let getDesc = (level) => "a = " + (0.1 + 0.05*level).toFixed(2);
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

    // Compute upgrade effects
    let A = 0.1 + 0.05*a.level;
    let B = 0.05 / (1 + b.level);
    let C = 0.05 + 0.03*c.level;
    let Alpha = 1 + 0.02*alpha.level;

    // Ratio
    let ratio = x.toNumber() / Math.max(E.toNumber(), 1e-10);

    // dE/dt
    let dE = A * Math.pow(x.toNumber(), Alpha) - B * E.toNumber();
    if (milestoneEquilibriumBoost.level > 0) dE += Math.log(x.toNumber() + 1);

    // dS/dt
    let dS = C - 0.1*Math.abs(ratio - 1) - 0.05*D;
    if (milestoneStressFeedback.level > 0) dS += 0.05*Math.sqrt(D);

    // dD/dt
    let dD = 0.1*Math.pow(ratio,2) - 0.1*S - 0.02*D;

    // dx/dt
    let growth = S * x.toNumber() * (1 - x.toNumber()/Math.max(E.toNumber(),1e-10));
    growth /= (1 + 0.05*D);
    if(milestoneResonance.level>0 && ratio>0.95 && ratio<1.05) growth *= 2;

    // Integrate
    x = BigNumber.from(x.toNumber() + growth*dt);
    E = BigNumber.from(E.toNumber() + dE*dt);
    S += dS*dt;
    D += dD*dt;

    currency.value = BigNumber.from(currency.value.toNumber() + x.toNumber() * dt);

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
}

var getPrimaryEquation = () => "\\dot{x} = Sx(1 - x/E) / (1 + λD)";
var getSecondaryEquation = () => "\\dot{E} = ax^α - bE";
var getTertiaryEquation = () => "S=" + S.toFixed(3) + ", D=" + D.toFixed(3);

init();
