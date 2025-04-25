const groupNames = [
    "Discover", "EFRE", "EPF", "eProcurement", "eRechnung", "Formularserver",
    "Gewan", "Limesurvey", "Medienupload", "MessageProxy", "Oscillator",
    "Sprungserver", "Vorhabensmgmt", "VUdat"
];

const backupCheckbox = document.getElementById("backupConfirm");
const submitBtn = document.getElementById("submitBtn");
const backupWarning = document.getElementById("backupWarning");

backupCheckbox.addEventListener("change", () => {
    submitBtn.disabled = !backupCheckbox.checked;
    backupWarning.style.display = backupCheckbox.checked ? "none" : "block";
});


const groupListContainer = document.getElementById("groupList");
groupNames.forEach(group => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" name="groups" value="${group}"> ${group}`;
    groupListContainer.appendChild(label);
});

document.getElementById('configForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const formatPath = (path) => path?.replace(/\\/g, '\\\\');

    const variables = {
        USERNAME: formData.get('USERNAME'),
        JAVAUSER: formData.get('JAVAUSER'),
        PubFileDir: formatPath(formData.get('PubFileDir') || ''),
        LogFileDir: formatPath(formData.get('LogFileDir') || '')
    };


    const selectedGroups = groupNames.filter(name => form.querySelector(`input[value="${name}"]`).checked);
    if (selectedGroups.length === 0) {
        alert("Bitte wähle mindestens eine Gruppe aus.");
        return;
    }
    const output = document.getElementById('output');
    output.textContent = '';

    const fetchGroupFiles = async (group) => {
        const fileUrl = `https://raw.githubusercontent.com/4RJN/regress/main/src/${group}/config.reg`;
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Fehler beim Laden der Datei: ${fileUrl}`);
            }
            const content = await response.text();
            return content
                .replace(/USERNAME/g, variables.USERNAME)
                .replace(/JAVAUSER/g, variables.JAVAUSER)
                .replace(/PubFileDir/g, variables.PubFileDir)
                .replace(/LogFileDir/g, variables.LogFileDir)
                .replace(/\[HKEY_CURRENT_USER\\Software\\SimonTatham\\PuTTY\\Sessions\]\n?/g, '')
                .trim();
        } catch (err) {
            console.error(`Fehler beim Laden der Gruppe ${group}:`, err);
            return '';
        }
    };

    const allSnippets = (await Promise.all(selectedGroups.map(fetchGroupFiles))).filter(Boolean);
    const finalContent = 'Windows Registry Editor Version 5.00\n\n[HKEY_CURRENT_USER\\Software\\SimonTatham\\PuTTY\\Sessions]\n\n' + allSnippets.join('\n\n');

    output.textContent = finalContent;

    const blob = new Blob([finalContent], {
        type: 'text/plain;charset=utf-16'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear().toString().slice(-2)}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
    const username = variables.USERNAME.trim().replace(/\s+/g, '_'); // Leerzeichen entfernen/ersetzen
    a.download = `${username}_putty-export_${timestamp}.reg`;

    a.click();
});