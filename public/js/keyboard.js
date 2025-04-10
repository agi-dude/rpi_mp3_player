// Keyboard.js - Virtual keyboard for touch input

class VirtualKeyboard {
    constructor() {
        // Elements
        this.keyboardEl = document.getElementById('virtualKeyboard');
        this.keyboardInputEl = document.getElementById('keyboardInput');
        this.keyboardLayoutEl = document.querySelector('.keyboard-layout');
        this.keyboardDoneBtn = document.getElementById('keyboardDoneBtn');

        // State
        this.targetInput = null;
        this.isShiftActive = false;
        this.isSymbolsActive = false;

        // Keyboard layouts
        this.layouts = {
            main: [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
                ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
                ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
                ['symbols', 'space', 'done']
            ],
            shift: [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
                ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'backspace'],
                ['symbols', 'space', 'done']
            ],
            symbols: [
                ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
                ['-', '_', '=', '+', '[', ']', '{', '}', '|', '\\'],
                [';', ':', "'", '"', ',', '.', '<', '>', '?', '/'],
                ['abc', '~', '`', '€', '£', '¥', '©', '®', 'backspace'],
                ['abc', 'space', 'done']
            ]
        };

        // Initialize
        this.init();
    }

    init() {
        // Generate keyboard layout
        this.generateLayout();

        // Event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Done button
        this.keyboardDoneBtn.addEventListener('click', () => {
            this.hide();
        });

        // Proxy input events to the target input
        this.keyboardInputEl.addEventListener('input', () => {
            if (this.targetInput) {
                this.targetInput.value = this.keyboardInputEl.value;

                // Trigger input event on the target
                const event = new Event('input', { bubbles: true });
                this.targetInput.dispatchEvent(event);
            }
        });
    }

    generateLayout(layoutType = 'main') {
        // Clear previous layout
        this.keyboardLayoutEl.innerHTML = '';

        const layout = this.layouts[layoutType];

        layout.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'keyboard-row';

            row.forEach(key => {
                const keyEl = document.createElement('button');
                keyEl.className = 'keyboard-key';

                // Special keys
                if (key === 'backspace') {
                    keyEl.classList.add('backspace');
                    keyEl.innerHTML = '<i class="fas fa-backspace"></i>';
                    keyEl.addEventListener('click', () => this.handleBackspace());
                } else if (key === 'shift') {
                    keyEl.classList.add('shift');
                    keyEl.innerHTML = '<i class="fas fa-arrow-up"></i>';
                    keyEl.addEventListener('click', () => this.toggleShift());

                    if (this.isShiftActive) {
                        keyEl.classList.add('active');
                    }
                } else if (key === 'symbols' || key === 'abc') {
                    keyEl.classList.add('special');
                    keyEl.textContent = key === 'symbols' ? '?123' : 'ABC';
                    keyEl.addEventListener('click', () => this.toggleSymbols());
                } else if (key === 'space') {
                    keyEl.classList.add('space');
                    keyEl.textContent = ' ';
                    keyEl.addEventListener('click', () => this.handleKeyPress(' '));
                } else if (key === 'done') {
                    keyEl.classList.add('special');
                    keyEl.textContent = 'Done';
                    keyEl.addEventListener('click', () => this.hide());
                } else {
                    // Regular keys
                    keyEl.textContent = key;
                    keyEl.addEventListener('click', () => this.handleKeyPress(key));
                }

                rowEl.appendChild(keyEl);
            });

            this.keyboardLayoutEl.appendChild(rowEl);
        });
    }

    handleKeyPress(key) {
        const currentValue = this.keyboardInputEl.value;
        const selStart = this.keyboardInputEl.selectionStart;
        const selEnd = this.keyboardInputEl.selectionEnd;

        // Insert the key at the cursor position or replace selected text
        const newValue = currentValue.substring(0, selStart) + key + currentValue.substring(selEnd);
        this.keyboardInputEl.value = newValue;

        // Update cursor position
        const newCursorPos = selStart + key.length;
        this.keyboardInputEl.setSelectionRange(newCursorPos, newCursorPos);

        // If shift is active, toggle it off after one key press
        if (this.isShiftActive) {
            this.toggleShift();
        }

        // Trigger input event
        const event = new Event('input', { bubbles: true });
        this.keyboardInputEl.dispatchEvent(event);
    }

    handleBackspace() {
        const currentValue = this.keyboardInputEl.value;
        const selStart = this.keyboardInputEl.selectionStart;
        const selEnd = this.keyboardInputEl.selectionEnd;

        if (selStart === selEnd) {
            // No selection, remove the character before the cursor
            if (selStart > 0) {
                this.keyboardInputEl.value = currentValue.substring(0, selStart - 1) + currentValue.substring(selEnd);
                // Update cursor position
                const newCursorPos = selStart - 1;
                this.keyboardInputEl.setSelectionRange(newCursorPos, newCursorPos);
            }
        } else {
            // Remove selected text
            this.keyboardInputEl.value = currentValue.substring(0, selStart) + currentValue.substring(selEnd);
            // Update cursor position
            this.keyboardInputEl.setSelectionRange(selStart, selStart);
        }

        // Trigger input event
        const event = new Event('input', { bubbles: true });
        this.keyboardInputEl.dispatchEvent(event);
    }

    toggleShift() {
        this.isShiftActive = !this.isShiftActive;

        if (this.isSymbolsActive) {
            // Don't change layout if symbols are active
            return;
        }

        this.generateLayout(this.isShiftActive ? 'shift' : 'main');
    }

    toggleSymbols() {
        this.isSymbolsActive = !this.isSymbolsActive;
        this.generateLayout(this.isSymbolsActive ? 'symbols' : (this.isShiftActive ? 'shift' : 'main'));
    }

    show(inputElement) {
        if (!inputElement) return;

        this.targetInput = inputElement;
        this.keyboardInputEl.value = inputElement.value;

        // Position cursor at the end
        this.keyboardInputEl.focus();
        this.keyboardInputEl.setSelectionRange(
            this.keyboardInputEl.value.length,
            this.keyboardInputEl.value.length
        );

        // Show keyboard
        this.keyboardEl.style.display = 'block';

        // Reset state
        this.isShiftActive = false;
        this.isSymbolsActive = false;
        this.generateLayout('main');

        // Adjust the app container to make room for the keyboard
        document.querySelector('.app-container').classList.add('keyboard-open');
    }

    hide() {
        // Hide keyboard
        this.keyboardEl.style.display = 'none';

        // Reset target input
        if (this.targetInput) {
            this.targetInput.value = this.keyboardInputEl.value;
            this.targetInput.focus();
            this.targetInput = null;
        }

        // Remove keyboard-open class
        document.querySelector('.app-container').classList.remove('keyboard-open');
    }

    prompt(title, placeholder, callback) {
        // Use the modal for prompting input
        modal.prompt(title, placeholder, callback);
    }
}

// Initialize the virtual keyboard
window.keyboard = new VirtualKeyboard();