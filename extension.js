const vscode = require('vscode');

function activate(context) {
    console.log('Congratulations, your extension "termagotchi" is now active!');

    const defaultPetState = {
        main: { health: 100, energy: 100 },
        commit: { health: 100, energy: 100 },
        paste: { health: 100, energy: 100 }
    };

    function cloneDefaultPetState() {
        return {
            main: { health: defaultPetState.main.health, energy: defaultPetState.main.energy },
            commit: { health: defaultPetState.commit.health, energy: defaultPetState.commit.energy },
            paste: { health: defaultPetState.paste.health, energy: defaultPetState.paste.energy }
        };
    }

    let petState = cloneDefaultPetState();
    let loseCount = context.globalState.get('loseCount', 0);
    if (!loseCount) {
        loseCount = 0;
    }
    let activePanel = null;

    function getPetName() {
        return context.globalState.get('petName', '');
    }

    function sendState(petNameOverride) {
        if (!activePanel) {
            return;
        }
        let name = '';
        if (petNameOverride !== undefined) {
            name = petNameOverride;
        } else {
            name = getPetName();
        }
        const message = {
            type: 'petState',
            pets: petState,
            loseCount: loseCount
        };
        if (name) {
            message.petName = name;
        }
        activePanel.webview.postMessage(message);
    }

    function setPetState(nextState) {
        petState = nextState;
        sendState();
    }

    // basically this gets the config from my package.json idk if thats where to store them but it works!
    function getDecayConfig() {
        const config = vscode.workspace.getConfiguration('termagotchi');
        return {
            intervalMs: 1000,
            lifetimes: {
                main: Math.max(0, Number(config.get('lifetimeMinutesMain', 15)) || 15),
                commit: Math.max(0, Number(config.get('lifetimeMinutesCommit', 20)) || 20),
                paste: Math.max(0, Number(config.get('lifetimeMinutesPaste', 12)) || 12)
            }
        };
    }

    // awesome maths woohoo!!
    function decayAmountFor(lifetimeMinutes, intervalMs) {
        if (lifetimeMinutes <= 0) {
            return 0;
        }
        const totalSeconds = lifetimeMinutes * 60;
        const tickSeconds = intervalMs / 1000;
        return (100 / totalSeconds) * tickSeconds;
    }

    function decayPets() {
        if (!getPetName()) {
            return;
        }
        const decayConfig = getDecayConfig();
        const intervalMs = decayConfig.intervalMs;
        const lifetimes = decayConfig.lifetimes;

        const mainDecay = decayAmountFor(lifetimes.main, intervalMs);
        const commitDecay = decayAmountFor(lifetimes.commit, intervalMs);
        const pasteDecay = decayAmountFor(lifetimes.paste, intervalMs);

        let mainHealth = petState.main.health - mainDecay;
        let mainEnergy = petState.main.energy - mainDecay;
        if (mainHealth < 0) {
            mainHealth = 0;
        }
        if (mainHealth > 100) {
            mainHealth = 100;
        }
        if (mainEnergy < 0) {
            mainEnergy = 0;
        }
        if (mainEnergy > 100) {
            mainEnergy = 100;
        }

        let commitHealth = petState.commit.health - commitDecay;
        let commitEnergy = petState.commit.energy - commitDecay;
        if (commitHealth < 0) {
            commitHealth = 0;
        }
        if (commitHealth > 100) {
            commitHealth = 100;
        }
        if (commitEnergy < 0) {
            commitEnergy = 0;
        }
        if (commitEnergy > 100) {
            commitEnergy = 100;
        }

        let pasteHealth = petState.paste.health - pasteDecay;
        let pasteEnergy = petState.paste.energy - pasteDecay;
        if (pasteHealth < 0) {
            pasteHealth = 0;
        }
        if (pasteHealth > 100) {
            pasteHealth = 100;
        }
        if (pasteEnergy < 0) {
            pasteEnergy = 0;
        }
        if (pasteEnergy > 100) {
            pasteEnergy = 100;
        }

        const nextState = {
            main: {
                health: mainHealth,
                energy: mainEnergy
            },
            commit: {
                health: commitHealth,
                energy: commitEnergy
            },
            paste: {
                health: pasteHealth,
                energy: pasteEnergy
            }
        };

        if (petState.main.health > 0 && nextState.main.health <= 0) {
            loseCount += 1;
            context.globalState.update('loseCount', loseCount);
            vscode.window.showWarningMessage('Main Pet has died.');
        }
        if (petState.commit.health > 0 && nextState.commit.health <= 0) {
            loseCount += 1;
            context.globalState.update('loseCount', loseCount);
            vscode.window.showWarningMessage('Commit Crab has died.');
        }
        if (petState.paste.health > 0 && nextState.paste.health <= 0) {
            loseCount += 1;
            context.globalState.update('loseCount', loseCount);
            vscode.window.showWarningMessage('Paste Pal has died.');
        }

        setPetState(nextState);
    }

    let decayInterval = null;
    function startDecayTimer() {
        if (decayInterval) {
            clearInterval(decayInterval);
        }
        const decayConfig = getDecayConfig();
        const intervalMs = decayConfig.intervalMs;
        const lifetimes = decayConfig.lifetimes;
        const allDisabled = lifetimes.main <= 0 && lifetimes.commit <= 0 && lifetimes.paste <= 0;
        if (intervalMs <= 0 || allDisabled) {
            decayInterval = null;
            return;
        }
        decayInterval = setInterval(decayPets, intervalMs);
    }

    // pet feeding based on input
    function feedPet(source) {
        if (!activePanel) {
            return;
        }
        if (!getPetName()) {
            return;
        }

        let targetPet = '';
        let healthDelta = 0;
        let energyDelta = 0;

        if (source === 'typing') {
            targetPet = 'main';
            healthDelta = 0.02;
            energyDelta = 0.015;
        } else if (source === 'commit') {
            targetPet = 'commit';
            healthDelta = 100;
            energyDelta = 100;
        } else if (source === 'paste') {
            targetPet = 'paste';
            healthDelta = 15;
            energyDelta = 15;
        }

        if (!targetPet) {
            return;
        }

        const current = petState[targetPet];
        let nextHealth = current.health + healthDelta;
        let nextEnergy = current.energy + energyDelta;
        if (nextHealth < 0) {
            nextHealth = 0;
        }
        if (nextHealth > 100) {
            nextHealth = 100;
        }
        if (nextEnergy < 0) {
            nextEnergy = 0;
        }
        if (nextEnergy > 100) {
            nextEnergy = 100;
        }
        const nextStats = {
            health: nextHealth,
            energy: nextEnergy
        };

        const nextState = {
            main: petState.main,
            commit: petState.commit,
            paste: petState.paste
        };

        if (targetPet === 'main') {
            nextState.main = nextStats;
        }
        if (targetPet === 'commit') {
            nextState.commit = nextStats;
        }
        if (targetPet === 'paste') {
            nextState.paste = nextStats;
        }

        setPetState(nextState);
    }

    // cute gifs for the pets based on their health
    function getWebviewContent(webview, petName) {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(context.extensionUri, 'style.css')
        );
        const petGifs = {
            main: {
                t25: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'main-25.gif')),
                t50: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'main-50.gif')),
                t75: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'main-75.gif')),
                t100: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'main-100.gif'))
            },
            commit: {
                t25: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'commit-25.gif')),
                t50: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'commit-50.gif')),
                t75: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'commit-75.gif')),
                t100: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'commit-100.gif'))
            },
            paste: {
                t25: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'paste-25.gif')),
                t50: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'paste-50.gif')),
                t75: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'paste-75.gif')),
                t100: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'gifs', 'paste-100.gif'))
            }
        };

        //scary html all inside one return. i hate this..

        return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>termagochi</title>
        <link rel="stylesheet" href="${styleUri}">
    </head>
    <body>
    <div class="holder">
        <div id="nameScreen" class="nameYourPet">
            <h1 class="petName">Welcome to termagotchi!</h1>
            <p class="paragraph">What do you want your pet to be called?</p>
            <p class="paragraphSmall">Your MAIN pet is a cat that feeds on typing.</p>
            <input id="petNameInput" class="input" type="text" placeholder="Kiros">
            <button id="petNameButton" class="button">continue!</button>
        </div>
        <div id="petScreen" class="petScreen hidden">
            <div class="petNav">
                <button id="petPrev" class="navButton navButtonLeft" aria-label="Previous pet">&lt;</button>
                <span id="petBadge" class="petBadge">MAIN PET</span>
                <button id="petNext" class="navButton navButtonRight" aria-label="Next pet">&gt;</button>
            </div>
            <div class="petMeta petMetaTop">
                <span class="petMetaLabel">Losses</span>
                <span id="lossCount" class="petMetaValue"></span>
            </div>
            <h1 id="petTitle" class="petTitle"></h1>
            <div class="petImageWrap">
                <img id="petImage" class="petImage" src="${petGifs.main.t25}" alt="pet">
            </div>
            <div class="bars">
                <div class="barRow">
                    <span class="barLabel">Health</span>
                    <div class="bar">
                        <div id="healthFill" class="barFill"></div>
                    </div>
                </div>
                <div class="barRow">
                    <span class="barLabel">Energy</span>
                    <div class="bar">
                        <div id="energyFill" class="barFill"></div>
                    </div>
                </div>
            </div>
            <p id="petHint" class="petHint"></p>
            <div class="resetWrap">
                <button id="resetButton" class="button buttonSecondary">reset all</button>
            </div>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const nameScreen = document.getElementById('nameScreen');
        const petScreen = document.getElementById('petScreen');
        const input = document.getElementById('petNameInput');
        const button = document.getElementById('petNameButton');
        const petPrev = document.getElementById('petPrev');
        const petNext = document.getElementById('petNext');
        const petBadge = document.getElementById('petBadge');
        const petTitle = document.getElementById('petTitle');
        const petImage = document.getElementById('petImage');
        const healthFill = document.getElementById('healthFill');
        const energyFill = document.getElementById('energyFill');
        const petHint = document.getElementById('petHint');
        const lossCount = document.getElementById('lossCount');
        const resetButton = document.getElementById('resetButton');

        const gifTiers = ${JSON.stringify(petGifs)};

        const state = {
            petName: ${JSON.stringify(petName)},
            pets: ${JSON.stringify(petState)},
            loseCount: ${loseCount}
        };

        const pets = [
            { id: 'main', baseName: 'Main Pet', hint: 'Main Pet feeds on typing.' },
            { id: 'commit', baseName: 'Commit Crab', hint: 'Commit Crab feeds on git commits.' },
            { id: 'paste', baseName: 'Paste Pal', hint: 'Paste Pal feeds on paste actions.' }
        ];
        let activePetIndex = 0;

        function pickGif(petId, health) {
            const tiers = gifTiers[petId] || gifTiers.main;
            if (health >= 100) {
                return tiers.t100;
            }
            if (health >= 75) {
                return tiers.t75;
            }
            if (health >= 50) {
                return tiers.t50;
            }
            return tiers.t25;
        }

        function renderState() {
            const activePet = pets[activePetIndex];
            const petStats = state.pets[activePet.id];
            const isMain = activePet.id === 'main';
            const title = isMain && state.petName ? state.petName : activePet.baseName;
            const hint = isMain
                ? (state.petName || activePet.baseName) + ' feeds on typing.'
                : activePet.hint;

            petTitle.textContent = title;
            petTitle.classList.toggle('petTitleClickable', isMain);
            petTitle.setAttribute('title', isMain ? 'Click to rename' : '');
            petHint.textContent = hint;
            petBadge.textContent = isMain ? 'MAIN PET' : 'SIDE PET';
            petImage.src = pickGif(activePet.id, petStats.health);
            healthFill.style.width = Math.max(0, Math.min(100, petStats.health)) + '%';
            energyFill.style.width = Math.max(0, Math.min(100, petStats.energy)) + '%';
            lossCount.textContent = String(state.loseCount || 0);
        }

        function showPetScreen(name) {
            state.petName = name;
            nameScreen.classList.add('hidden');
            petScreen.classList.remove('hidden');
            renderState();
        }

        function showNameScreen() {
            nameScreen.classList.remove('hidden');
            petScreen.classList.add('hidden');
            input.value = '';
        }

        function switchPet(direction) {
            if (direction === 'next') {
                activePetIndex = (activePetIndex + 1) % pets.length;
            } else {
                activePetIndex = (activePetIndex - 1 + pets.length) % pets.length;
            }
            renderState();
        }

        button.addEventListener('click', function () {
            const name = input.value.trim();
            if (!name) {
                return;
            }
            showPetScreen(name);
            vscode.postMessage({ type: 'savePetName', value: name });
        });

        resetButton.addEventListener('click', function () {
            vscode.postMessage({ type: 'resetAll' });
        });

        petPrev.addEventListener('click', function () { switchPet('prev'); });
        petNext.addEventListener('click', function () { switchPet('next'); });
        petTitle.addEventListener('click', function () {
            const activePet = pets[activePetIndex];
            if (activePet.id !== 'main') {
                return;
            }
            vscode.postMessage({ type: 'requestRenameMain' });
        });

        window.addEventListener('message', function (event) {
            const message = event.data;
            if (!message || message.type !== 'petState') {
                return;
            }
            let showName = false;
            let showPet = false;
            if (message.pets) {
                state.pets = message.pets;
            }
            if (message.petName !== undefined) {
                state.petName = message.petName || '';
                showName = !state.petName;
                showPet = !!state.petName;
            }
            if (typeof message.loseCount === 'number') {
                state.loseCount = message.loseCount;
            }
            if (showName) {
                showNameScreen();
                return;
            }
            if (showPet && petScreen.classList.contains('hidden')) {
                showPetScreen(state.petName);
                return;
            }
            if (!petScreen.classList.contains('hidden')) {
                renderState();
            }
        });

        if (state.petName) {
            showPetScreen(state.petName);
        } else {
            showNameScreen();
        }
    </script>
    </body>
    </html>`;
    }

    //vscode extension stuff
    const disposable = vscode.commands.registerCommand('termagotchi.termagotchi', function () {
        vscode.window.showInformationMessage('Termagotchi session started. Good luck!');

        const panel = vscode.window.createWebviewPanel(
            'termagotchi',
            'termagotchi',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media'),
                    context.extensionUri
                ]
            }
        );
        activePanel = panel;

        panel.onDidDispose(function () {
            if (activePanel === panel) {
                activePanel = null;
            }
        });

        panel.webview.onDidReceiveMessage(async function (message) {
            if (message && message.type === 'savePetName') {
                if (getPetName()) {
                    return;
                }
                const petName = message.value || '';
                context.globalState.update('petName', petName);
                console.log('pet added with name: ' + petName);
                sendState(petName);
            }

            if (message && message.type === 'requestRenameMain') {
                const currentName = getPetName();
                const nextName = await vscode.window.showInputBox({
                    prompt: 'Rename your main pet',
                    value: currentName
                });
                if (!nextName) {
                    return;
                }
                const trimmed = nextName.trim();
                if (!trimmed) {
                    return;
                }
                context.globalState.update('petName', trimmed);
                console.log('pet renamed to: ' + trimmed);
                sendState(trimmed);
            }

            if (message && message.type === 'resetAll') {
                const config = vscode.workspace.getConfiguration('termagotchi');
                const resetTasks = [
                    config.update('lifetimeMinutesMain', undefined, vscode.ConfigurationTarget.Global),
                    config.update('lifetimeMinutesCommit', undefined, vscode.ConfigurationTarget.Global),
                    config.update('lifetimeMinutesPaste', undefined, vscode.ConfigurationTarget.Global),
                    config.update('lifetimeMinutesMain', undefined, vscode.ConfigurationTarget.Workspace),
                    config.update('lifetimeMinutesCommit', undefined, vscode.ConfigurationTarget.Workspace),
                    config.update('lifetimeMinutesPaste', undefined, vscode.ConfigurationTarget.Workspace)
                ];
                await Promise.all(resetTasks);

                petState = cloneDefaultPetState();
                loseCount = 0;
                await context.globalState.update('loseCount', loseCount);
                await context.globalState.update('petName', undefined);

                startDecayTimer();
                sendState('');
            }
        });

        petState = cloneDefaultPetState();
        loseCount = context.globalState.get('loseCount', 0);
        if (!loseCount) {
            loseCount = 0;
        }

        panel.webview.html = getWebviewContent(
            panel.webview,
            getPetName()
        );
    });

    const typingListener = vscode.workspace.onDidChangeTextDocument(function (changeEvent) {
        const isPaste = changeEvent.contentChanges.some(function (change) {
            return change.text.length > 1;
        });
        if (isPaste) {
            feedPet('paste');
            return;
        }
        feedPet('typing');
    });

    const registerGitCommitListener = function () {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            return;
        }
        gitExtension.activate().then(function () {
            const git = gitExtension.exports.getAPI(1);
            const repoHeads = new Map();

            function getHeadCommit(repo) {
                if (!repo || !repo.state || !repo.state.HEAD) {
                    return null;
                }
                return repo.state.HEAD.commit || null;
            }

            function trackRepo(repo) {
                repoHeads.set(repo, getHeadCommit(repo));
                const repoSub = repo.state.onDidChange(function () {
                    const current = getHeadCommit(repo);
                    const previous = repoHeads.get(repo) || null;
                    if (current && current !== previous) {
                        repoHeads.set(repo, current);
                        feedPet('commit');
                    }
                });
                context.subscriptions.push(repoSub);
            }

            git.repositories.forEach(trackRepo);
            context.subscriptions.push(git.onDidOpenRepository(trackRepo));
            context.subscriptions.push(git.onDidCloseRepository(function (repo) {
                repoHeads.delete(repo);
            }));
        });
    };

    const configListener = vscode.workspace.onDidChangeConfiguration(function (event) {
        if (event.affectsConfiguration('termagotchi')) {
            startDecayTimer();
        }
    });

    startDecayTimer();

    context.subscriptions.push(disposable);
    context.subscriptions.push(typingListener);
    context.subscriptions.push(configListener);
    context.subscriptions.push({ dispose: function () { return decayInterval && clearInterval(decayInterval); } });
    registerGitCommitListener();
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
};
