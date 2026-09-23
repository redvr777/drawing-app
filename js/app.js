import { Editor } from "./editor.js";
import { setupUI } from "./ui.js";

const editor = new Editor();
setupUI(editor);
window.drawForge = editor;
