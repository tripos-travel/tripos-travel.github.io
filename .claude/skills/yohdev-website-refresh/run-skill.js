#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Skill activation detection
function detectActivation(input) {
    const triggers = [
        /discovery brief/i,
        /client kickoff/i,
        /run the yohdev playbook/i,
        /start phase 01/i
    ];

    return triggers.some(trigger => trigger.test(input));
}

// The keys BrandIntakeAnswers requires at the top level.
// See reference/intake-contract.md for the full shape and where it comes from.
const REQUIRED_INTAKE_KEYS = [
    'discoveryBrief',
    'brandIdentity',
    'logoAndColors',
    'currentWebsite',
    'targetAudience',
    'strategy',
    'clientProfile',
    'techStack',
    'projectLogistics'
];

// Locate the intake contract file: explicit state config, then env var, then default.
function findIntakeFile(configuredPath) {
    const candidate = configuredPath || process.env.YOHDEV_INTAKE_FILE || path.join(process.cwd(), 'intake', 'answers.json');
    return fs.existsSync(candidate) ? candidate : null;
}

// Lightweight structural check only — not full schema validation. The platform is expected to
// have already validated this against BrandIntakeAnswersSchema before handing off a build.
function validateIntakeShape(intakePath) {
    const raw = fs.readFileSync(intakePath, 'utf8');
    let data;

    try {
        data = JSON.parse(raw);
    } catch (error) {
        return { ok: false, errors: [`Not valid JSON: ${error.message}`] };
    }

    const errors = REQUIRED_INTAKE_KEYS
        .filter((key) => typeof data[key] !== 'object' || data[key] === null)
        .map((key) => `Missing or invalid top-level key: "${key}"`);

    return { ok: errors.length === 0, errors, data };
}

// Main skill execution
class YohDevWebsiteRefresh {
    constructor() {
        this.stateFile = path.join(process.cwd(), '.yohdev-state.json');
        this.state = this.loadState();
    }
    
    loadState() {
        if (fs.existsSync(this.stateFile)) {
            return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        }
        
        return {
            version: "0.1.0",
            client: null,
            current_phase: null,
            completed_phases: [],
            phase_outputs: {},
            config: {
                intake_file: null,
                output_dir: "output",
                client_slug: null
            }
        };
    }

    saveState() {
        fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    }

    run() {
        console.log('🚀 YohDev Website Refresh Skill Activated');
        console.log('=========================================\n');

        // Find the intake contract file (see reference/intake-contract.md)
        const intakePath = findIntakeFile(this.state.config.intake_file);

        if (!intakePath) {
            console.log('❌ No intake data found.');
            console.log('\nExpected a BrandIntakeAnswers-shaped JSON file at "intake/answers.json"');
            console.log('(or wherever state.config.intake_file / YOHDEV_INTAKE_FILE points).');
            console.log('See reference/intake-contract.md for the schema.');
            return;
        }

        const { ok, errors } = validateIntakeShape(intakePath);

        if (!ok) {
            console.log(`❌ Intake data at ${intakePath} does not match the contract:`);
            errors.forEach((error) => console.log(`  - ${error}`));
            console.log('\nThis is a fail-fast structural check only (see reference/intake-contract.md);');
            console.log('it does not pause for a human to patch gaps. Fix the upstream data and re-run.');
            return;
        }

        this.state.config.intake_file = intakePath;
        this.saveState();

        console.log(`📄 Using intake data: ${intakePath}\n`);

        // Determine next phase
        const nextPhase = this.getNextPhase();
        
        if (!nextPhase) {
            console.log('✅ All phases complete! Package ready for delivery.');
            return;
        }
        
        console.log(`\n📍 Next phase: ${this.getPhaseTitle(nextPhase)}`);
        console.log('─'.repeat(50));
        
        // Show phase description
        this.showPhaseInfo(nextPhase);
        
        console.log('\nTo continue, run the appropriate phase command or use:');
        console.log('  npm run continue');
    }
    
    getNextPhase() {
        const phases = ['phase_01', 'phase_02', 'phase_03', 'phase_04', 'phase_05', 'phase_06'];
        
        for (const phase of phases) {
            if (!this.state.completed_phases.includes(phase)) {
                return phase;
            }
        }
        
        return null;
    }
    
    getPhaseTitle(phase) {
        const titles = {
            'phase_01': 'Phase 01 - Intake',
            'phase_02': 'Phase 02 - Research',
            'phase_03': 'Phase 03 - System',
            'phase_04': 'Phase 04 - Home Page',
            'phase_05': 'Phase 05 - Style Guide',
            'phase_06': 'Phase 06 - Package'
        };
        
        return titles[phase] || phase;
    }
    
    showPhaseInfo(phase) {
        const phaseFile = path.join(__dirname, 'phases', `${phase.replace('_', '-')}.md`);
        
        if (fs.existsSync(phaseFile)) {
            const content = fs.readFileSync(phaseFile, 'utf8');
            const purposeMatch = content.match(/## Purpose\n(.+?)(?=\n##)/s);
            
            if (purposeMatch) {
                console.log('\n' + purposeMatch[1].trim());
            }
        }
    }
}

// CLI entry point
if (require.main === module) {
    const skill = new YohDevWebsiteRefresh();
    
    // Check if skill should activate based on input
    const input = process.argv.slice(2).join(' ');
    
    if (input && !detectActivation(input)) {
        console.log('This doesn\'t appear to be a YohDev Website Refresh request.');
        console.log('Try: "run the YohDev playbook" or "start Phase 01"');
        process.exit(0);
    }
    
    skill.run();
}

module.exports = { YohDevWebsiteRefresh, detectActivation, findIntakeFile, validateIntakeShape };