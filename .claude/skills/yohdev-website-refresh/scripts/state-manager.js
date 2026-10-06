#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'state.json');
const WORKSPACE_STATE = path.join(process.cwd(), '.yohdev-state.json');

class StateManager {
    constructor() {
        this.state = this.loadState();
    }

    loadState() {
        // Try workspace state first, then default state
        const stateFile = fs.existsSync(WORKSPACE_STATE) ? WORKSPACE_STATE : STATE_FILE;
        
        try {
            const data = fs.readFileSync(stateFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading state:', error);
            return this.getDefaultState();
        }
    }

    saveState() {
        try {
            fs.writeFileSync(WORKSPACE_STATE, JSON.stringify(this.state, null, 2));
            console.log('State saved to:', WORKSPACE_STATE);
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    getDefaultState() {
        return {
            version: "0.1.0",
            client: null,
            current_phase: null,
            completed_phases: [],
            phase_outputs: {},
            start_time: null,
            phase_times: {},
            placeholders: [],
            decisions: {},
            config: {
                intake_file: null,
                output_dir: "output",
                client_slug: null
            }
        };
    }

    setClient(clientName, intakeFile) {
        this.state.client = clientName;
        this.state.config.intake_file = intakeFile;
        this.state.config.client_slug = clientName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        this.state.start_time = new Date().toISOString();
        this.saveState();
    }

    startPhase(phaseNumber) {
        const phaseName = `phase_${String(phaseNumber).padStart(2, '0')}`;
        this.state.current_phase = phaseName;
        this.state.phase_times[phaseName] = {
            start: new Date().toISOString(),
            end: null
        };
        this.saveState();
    }

    completePhase(phaseNumber, outputs = {}) {
        const phaseName = `phase_${String(phaseNumber).padStart(2, '0')}`;
        
        if (!this.state.completed_phases.includes(phaseName)) {
            this.state.completed_phases.push(phaseName);
        }
        
        this.state.phase_outputs[phaseName] = outputs;
        
        if (this.state.phase_times[phaseName]) {
            this.state.phase_times[phaseName].end = new Date().toISOString();
        }
        
        this.state.current_phase = null;
        this.saveState();
    }

    addPlaceholder(file, line, placeholder) {
        this.state.placeholders.push({
            file,
            line,
            placeholder,
            resolved: false
        });
        this.saveState();
    }

    addDecision(key, value) {
        this.state.decisions[key] = value;
        this.saveState();
    }

    getCurrentPhase() {
        return this.state.current_phase;
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

    isPhaseComplete(phaseNumber) {
        const phaseName = `phase_${String(phaseNumber).padStart(2, '0')}`;
        return this.state.completed_phases.includes(phaseName);
    }

    reset() {
        this.state = this.getDefaultState();
        this.saveState();
    }

    getStatus() {
        const totalPhases = 6;
        const completedCount = this.state.completed_phases.length;
        const progress = Math.round((completedCount / totalPhases) * 100);
        
        return {
            client: this.state.client,
            current_phase: this.state.current_phase,
            completed_phases: this.state.completed_phases,
            progress: `${progress}%`,
            next_phase: this.getNextPhase(),
            start_time: this.state.start_time,
            config: this.state.config
        };
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    const manager = new StateManager();

    switch (command) {
        case 'status':
            console.log(JSON.stringify(manager.getStatus(), null, 2));
            break;
        
        case 'set-client':
            if (args.length < 3) {
                console.error('Usage: state-manager.js set-client <name> <intake-file>');
                process.exit(1);
            }
            manager.setClient(args[1], args[2]);
            break;
        
        case 'start-phase':
            if (args.length < 2) {
                console.error('Usage: state-manager.js start-phase <number>');
                process.exit(1);
            }
            manager.startPhase(args[1]);
            break;
        
        case 'complete-phase':
            if (args.length < 2) {
                console.error('Usage: state-manager.js complete-phase <number>');
                process.exit(1);
            }
            manager.completePhase(args[1]);
            break;
        
        case 'next-phase':
            console.log(manager.getNextPhase() || 'All phases complete');
            break;
        
        case 'reset':
            manager.reset();
            console.log('State reset');
            break;
        
        default:
            console.log('Commands: status, set-client, start-phase, complete-phase, next-phase, reset');
    }
}

module.exports = StateManager;