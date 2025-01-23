document.addEventListener('DOMContentLoaded', async () => {
    const spinner = document.getElementById('loadingSpinner');
    const spinnerText = document.getElementById('spinnerText');
    const output = document.getElementById('output');
         const themeToggle = document.getElementById('themeToggle');
          const moonIcon = document.getElementById('moonIcon');
          const sunIcon = document.getElementById('sunIcon');
           const savedCodeContainer = document.querySelector('.saved-code-container');
    let pyodide;

const editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    lineNumbers: true,
    mode: 'python',
    theme: 'default',
    lineWrapping: true,
    inputStyle: 'textarea', // Better for WebView compatibility
    extraKeys: {
        "Ctrl-Space": () => CodeMirror.showHint(editor, pythonHint, { completeSingle: false }),
    },
    hintOptions: {
        completeSingle: false // Don't auto-complete single matches
    },
});

// Define the suggestion function
editor.setOption("extraKeys", {
    "Ctrl-Space": "autocomplete" // Trigger autocomplete on Ctrl-Space
});

function pythonHint(editor) {
    const cursor = editor.getCursor();
    const token = editor.getTokenAt(cursor);
    const start = token.start;
    const end = token.end;
    const currentWord = token.string;
const pythonKeywords = [
    "False", "None", "True", "and", "as", "assert", "async", "await", "break",
    "class", "continue", "def", "del", "elif", "else", "except", "finally",
    "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
    "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
    "print", "input", "len", "range", "int", "float", "str", "list", "dict",
    "tuple", "set", "open", "help", "type", "dir", "id", "map", "filter", "zip"
];
    // Include user-defined variables and methods
    const userCode = editor.getValue();
    const userDefined = userCode.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    const uniqueSuggestions = [...new Set([...pythonKeywords, ...userDefined])];

    const suggestions = uniqueSuggestions.filter(keyword =>
        keyword.startsWith(currentWord)
    );

    return {
        list: suggestions,
        from: CodeMirror.Pos(cursor.line, start),
        to: CodeMirror.Pos(cursor.line, end),
    };
}

// Attach autocomplete to inputRead
editor.on("inputRead", function (editor, event) {
    if (!event.text[0].match(/[a-zA-Z_]/)) return; // Trigger only on valid characters
    CodeMirror.showHint(editor, pythonHint, { completeSingle: false });
});


  async function initializePyodide() {
      if (!pyodide) {
          spinner.classList.add('loading'); // Show spinner
                output.textContent = `Initializing Pyodide...
If it takes too long,
Try restarting your app or
Check your Internet connection.`;

          try {
              pyodide = await loadPyodide(); // Load Pyodide
              pyodide.runPython(`
                  import sys
                  from js import document, window

                  def input(prompt=""):
                      # Display the prompt in the output section
                      document.getElementById("output").innerHTML += f"{prompt}<br>"

                      # Use JavaScript's prompt to get user input
                      result = window.prompt(prompt)

                      if result is None:  # Handle cancel
                          raise Exception("Input was canceled.")

                      if len(result) > 500:  # Optional: Limit input length
                          raise Exception("Input is too long. Maximum allowed length is 500 characters.")

                      # Display the user's input in the output section
                      document.getElementById("output").innerHTML += f"{result}<br>"

                      return result


                  class OutputRedirect:
                      def __init__(self):
                          self.output = document.getElementById("output")
                          self.line_limit = 1000
                          self.char_limit = 5000
                          self.line_count = 0
                          self.total_chars = 0

                      def write(self, message):
                          self.line_count += message.count("\\n")
                          self.total_chars += len(message)

                          if self.line_count > self.line_limit or self.total_chars > self.char_limit:
                              self.output.innerHTML = "Error: Infinite output detected. Code is not runnable."
                              raise Exception("Infinite output detected.")

                          self.output.innerHTML += message.replace("\\n", "<br>")

                      def flush(self):
                          pass

                      def reset(self):
                        self.line_count = 0
                        self.total_chars = 0
                        self.output.innerHTML = ""  # Clear the output section

                  sys.stdout = OutputRedirect()
                  sys.stderr = OutputRedirect()
                  stdout_instance = sys.stdout
                  stderr_instance = sys.stderr
              `);

              output.textContent = "Coding Demands Patience.";
          } catch (error) {
              output.textContent = `Error initializing Pyodide: ${error.message}.
Please check your internet connection or
try refreshing the page.`;
          } finally {
              spinner.classList.remove('loading'); // Hide spinner
          }
      }
  }






    await initializePyodide(); // Initialize Pyodide on page load

    // Run Code Button
  document.getElementById('runButton').addEventListener('click', async () => {
      // Clear the output area
      output.textContent = "";

      try {
          // Reset the Python output redirection state
          await pyodide.runPython("stdout_instance.reset()");
          await pyodide.runPython("stderr_instance.reset()");

          // Get the user's code from the editor
          const code = editor.getValue();

          // Execute the code in Pyodide
          await pyodide.runPythonAsync(code);
      } catch (error) {
          // Handle and display the error
          const realError = error.message || "An unexpected error occurred.";
          output.textContent = `Error: ${realError}`;
      }
  });



    // Copy Code Button
    document.getElementById('copyCode').addEventListener('click', () => {
        const code = editor.getValue();
        navigator.clipboard.writeText(code).then(() => {
            alert("Code copied to clipboard!");
        });
    });

    // Save Code Button
    document.getElementById('saveCode').addEventListener('click', () => {
        const code = editor.getValue(); // Get code from editor
        if (!code.trim()) {
            alert("Cannot save empty code!");
            return;
        }

        let savedCodes = JSON.parse(localStorage.getItem('savedCodes')) || [];
        savedCodes.push(code);
        localStorage.setItem('savedCodes', JSON.stringify(savedCodes));
        alert("Code saved successfully!");
        updateSavedCodeList(savedCodes);
    });

    // Update Saved Code List
    function updateSavedCodeList(savedCodes) {
        const savedCodeList = document.getElementById('savedCodeList');
        savedCodeList.innerHTML = ''; // Clear list

        if (savedCodes.length === 0) {
            savedCodeList.textContent = "No saved code yet.";
            return;
        }

        savedCodes.forEach((code, index) => {
            const codeBlock = document.createElement('div');
            codeBlock.classList.add('saved-code-item');

            const codeContent = document.createElement('pre');
            codeContent.textContent = code;
            codeBlock.appendChild(codeContent);

            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('button-container');

            const copyButton = document.createElement('button');
            copyButton.classList.add('copy-button');
            copyButton.textContent = 'Copy';
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(code).then(() => {
                    alert('Code copied to clipboard!');
                });
            });

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => {
                savedCodes.splice(index, 1);
                localStorage.setItem('savedCodes', JSON.stringify(savedCodes));
                updateSavedCodeList(savedCodes);
            });

            buttonContainer.appendChild(copyButton);
            buttonContainer.appendChild(deleteButton);
            codeBlock.appendChild(buttonContainer);
            savedCodeList.appendChild(codeBlock);

            if (document.body.getAttribute('data-theme') === 'dark') {
                codeBlock.classList.add('dark-theme');
            }
        });
    }

    // Load Saved Codes on Page Load
    const savedCodes = JSON.parse(localStorage.getItem('savedCodes')) || [];
    updateSavedCodeList(savedCodes);

    // Theme Toggle
function applyTheme(theme) {
    if (theme === 'dark') {
        // Apply dark theme
        document.body.setAttribute('data-theme', 'dark');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
        editor.setOption('theme', 'dracula'); // Set CodeMirror theme to dracula
        savedCodeContainer.setAttribute('data-theme', 'dark');
    } else {
        // Apply light theme
        document.body.removeAttribute('data-theme');
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
        editor.setOption('theme', 'default'); // Set CodeMirror theme to default
        savedCodeContainer.removeAttribute('data-theme');
    }

    // Persist theme in localStorage
    localStorage.setItem('theme', theme);
}

// Load the stored theme when the page loads
const storedTheme = localStorage.getItem('theme') || 'light'; // Default to 'light' if no theme is stored
applyTheme(storedTheme);

// Add event listener for theme toggle
themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
});


// Clear Output and Input Button
const clearButton = document.getElementById('clearCode');
clearButton.addEventListener('click', () => {
    editor.setValue(''); // Clears the content in the CodeMirror editor
    output.innerHTML = ""; // Clears the output
});
});
////




