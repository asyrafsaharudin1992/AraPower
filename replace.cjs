const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const startStr = '<form onSubmit={handleSaveService} className="grid grid-cols-1 lg:grid-cols-2 gap-12">';
const endStr = '                        {/* List Section */}';
const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  const newCode = code.substring(0, startIdx) + 
    '                    <AddServiceForm />\n                  </div>\n                  \n                  <div className={`${darkMode ? \\\'bg-[#1e293b] border-violet-500\\\' : \\\'bg-white border-black/5 shadow-sm\\\'} p-8 rounded-[2.5rem] border mt-8`}>\n' +
    code.substring(endIdx);
  fs.writeFileSync('src/App.tsx', newCode);
  console.log('Replaced form part 1');
} else {
  console.log('Could not find start or end');
}

// Now replace the closing </form>
code = fs.readFileSync('src/App.tsx', 'utf8');
const formCloseStr = '                    </form>';
const formCloseIdx = code.lastIndexOf(formCloseStr);
if (formCloseIdx !== -1) {
  const newCode = code.substring(0, formCloseIdx) + '                    </div>' + code.substring(formCloseIdx + formCloseStr.length);
  fs.writeFileSync('src/App.tsx', newCode);
  console.log('Replaced form part 2');
} else {
  console.log('Could not find form close');
}
