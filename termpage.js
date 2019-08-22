const Termpage = {

  defaultOptions: {
    prompt: '$',
    initialCommand: false,
    autoFocus: true
  },

  _appendInput: (input, options, dom) => {
    if (dom.$winElement.lastChild && dom.$winElement.lastChild.tagName === 'UL') {
      dom.$winElement.lastChild.remove();
    }
    const prmpt = options.prompt + '&nbsp';
    const pre = document.createElement("pre");;
    const encodedInput = input.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
      return '&#'+i.charCodeAt(0)+';';
    });
    pre.innerHTML = prmpt + encodedInput + '\n';
    pre.className = 'termpage-block';
    dom.$output.appendChild(pre);
  },

  _appendOutput: (output, options, dom) => {
    let outputText = "undefined";
    let commands = [];
    if (typeof(output) === "string") {
      outputText = output;
    } else if (typeof(output) === "object") {
      outputText = output.text;
      commands = output.commands || [];
    }
    const pre = document.createElement("pre");
    pre.innerHTML = outputText;
    pre.className = 'termpage-block';
    dom.$output.appendChild(pre);
    if (commands.length) {
      const $commands = document.createElement('ul');
      $commands.className = 'termpage-menu termpage-block';
      commands.forEach(command => {
        const $command = document.createElement('li');
        $command.innerHTML = command + '&nbsp;';
        $commands.appendChild($command);
        $command.addEventListener('click', () => {
          Termpage._appendInput($command.innerText, options, dom);
          const out = options.processInput($command.innerText);
          Termpage._processInput(out, options, dom);
        });
      });
      dom.$winElement.appendChild($commands);
    }
    dom.$winElement.scrollTo(0, dom.$winElement.scrollHeight);
    dom.$input.focus();
  },

  _processInput: (output, options, dom) => {
    if (output && output.then) {
      const pre = document.createElement("pre");
      pre.innerHTML = '.';
      pre.className = 'termpage-loader termpage-block';
      dom.$output.appendChild(pre);
      dom.$inputBlock.setAttribute('style', 'display:none');
      dom.$winElement.scrollTo(0, dom.$winElement.scrollHeight);
      output.then((out) => {
        pre.remove();
        dom.$inputBlock.setAttribute('style', 'display:flex');
        Termpage._appendOutput(out, options, dom);
      });
      output.catch(() => {
        pre.remove();
        dom.$inputBlock.setAttribute('style', 'display:flex');
        Termpage._appendOutput(Termpage.color('red', 'command resolution failed'), options, dom);
      });
    } else {
      Termpage._appendOutput(output, options, dom);
    }
  },

  link: (url, text) => {
    const res = (t) => `<a href="${url}" target="_blank">${t}</a>`;
    if (!text) {
      return (text) => {
        return res(text);
      };
    }
    return res(text);
  },

  color: (color, text) => {
    const res = (t) => `<span style="color:${color}">${t}</span>`;
    if (!text) {
      return (text) => {
        return res(text);
      };
    }
    return res(text);
  },

  replace: (text, changes) => {
    let response = text;
    Object.keys(changes).forEach(key => {
      response = response.replace(key, changes[key](key));
    });
    return response;
  },

  init: ($winElement, processInput, options = {}) => {
    const history = [];
    let historyIndex = 0;
    options = Object.assign({}, Termpage.defaultOptions, options);
    const $output = document.createElement("div");
    $winElement.appendChild($output);

    const prompt = options.prompt || Termpage.defaultOptions.prompt;
    const $prompt = document.createElement("span");
    $prompt.className = "termpage-prompt";
    $prompt.innerHTML = prompt + "&nbsp;";

    const $input = document.createElement("input");
    $input.setAttribute("type", "text");
    $input.className = "termpage-input";

    const $inputBlock = document.createElement("p");
    $inputBlock.className = "termpage-block termpage-input-block";

    $inputBlock.appendChild($prompt);
    $inputBlock.appendChild($input);
    $winElement.appendChild($inputBlock);

    const dom = {
      $inputBlock,
      $input,
      $winElement,
      $output
    }

    options.processInput = (inp) => {
      historyIndex = 0;
      history.push(inp);
      return processInput(inp);
    };

    if (options.initialCommand) {
      const output = processInput(options.initialCommand);
      Termpage._appendInput(options.initialCommand, options, dom);
      Termpage._processInput(output, options, dom);
    }

    $input.addEventListener('keydown', function (e) {
      var key = e.which || e.keyCode;
      if (key === 13) { // 13 is enter
        const input = e.srcElement.value;
        const output = input ? options.processInput(input) : '';
        Termpage._appendInput(input, options, dom);
        Termpage._processInput(output, options, dom);
        $input.value = '';
      } if (key === 38) { // up
        const val = history[history.length - historyIndex - 1];
        if (val) {
          historyIndex++;
          dom.$input.value = val;
        }
      } else if (key === 40) { // down
        const val = history[history.length - historyIndex + 1];
        if (val) {
          historyIndex--;
          dom.$input.value = val;
        }
      }
    });

    if (options.autoFocus) {
      $input.focus();
    }
    $winElement.addEventListener("click", function(){
      const sel = getSelection().toString();
      if(!sel){
        $input.focus();
      }
    });
  }
};

(() => {
  const styles = `
html, body {
  margin: 0;
  padding: 0;
}

.termpage-window {
  overflow-y: auto;
}

.termpage-block {
  margin: 0;
  padding: 0;
  white-space: pre-wrap;
  word-break: keep-all;
}

.termpage-input-block {
  display: flex;
}

.termpage-input {
  border-width: 0;
  outline: 0;
  flex: 1;
  padding: 0;
}

.termpage-menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}

.termpage-loader::before {
  content: '';
  animation: termpage-loader 0.5s infinite;
}

@keyframes termpage-loader {
  0% {
    content: '';
  }
  25% {
    content: '.';
  }
  50% {
    content: '..';
  }
  75% {
    content: '...';
  }
}
  `
  const styleSheet = document.createElement("style")
  styleSheet.type = "text/css"
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
  const theme = `
.termpage-window {
  background-color: black;
  border: 2px solid #888;
  padding-top: 5px;
}

.termpage-window * {
  font-family: "Courier New", Courier, monospace;
  font-size: 16px;
  color: #ddd;
}

.termpage-input {
  background-color: #222;
  color: #ddd;
  caret-color: white;
}

.termpage-block, .termpage-input {
  line-height: 20px;
  padding-left: 5px;
  padding-right: 5px;
}

.termpage-window a {
  background-color: #888;
  text-decoration: none;
  cursor:pointer;
}
.termpage-window a:hover {
  background-color: #333;
}

.termpage-menu {
  background-color: #888;
}

.termpage-menu li:hover {
  background-color: #666;
  cursor: pointer;
}
  `
  const themeSheet = document.createElement("style")
  themeSheet.type = "text/css"
  themeSheet.innerText = theme;
  document.head.appendChild(themeSheet)
})();

