"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readConfig = readConfig;
exports.writeConfig = writeConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const CONFIG_PATH = path_1.default.join(os_1.default.homedir(), '.revolt-cli-config.json');
function readConfig() {
    if (fs_1.default.existsSync(CONFIG_PATH)) {
        const content = fs_1.default.readFileSync(CONFIG_PATH, 'utf-8');
        try {
            return JSON.parse(content);
        }
        catch (e) {
            return {};
        }
    }
    return {};
}
function writeConfig(config) {
    fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
