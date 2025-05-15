        const container = document.getElementById('container');
        const zoneViewer = document.getElementById('zoneViewer');
        let zoneFrame = document.getElementById('zoneFrame');
        const searchBar = document.getElementById('searchBar');
        const sortOptions = document.getElementById('sortOptions');
        // https://www.jsdelivr.com/tools/purge
        const zonesURL = "https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json";
        const coverURL = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
        const htmlURL = "https://cdn.jsdelivr.net/gh/gn-math/html@main";
        let zones = [];
        let popularityData = {};
        async function listZones() {
            try {
                const response = await fetch(zonesURL+"?t="+Date.now());
                const json = await response.json();
                zones = json;
                await fetchPopularity();
                sortZones();
                const search = new URLSearchParams(window.location.search);
                const id = search.get('id');
                if (id) {
                    const zone = zones.find(zone => zone.id + '' == id + '');
                    if (zone) {
                        openZone(zone);
                    }
                }
            } catch (error) {
                container.innerHTML = `Error loading zones: ${error}`;
            }
        }
        async function fetchPopularity() {
            try {
                const response = await fetch("https://data.jsdelivr.com/v1/stats/packages/gh/gn-math/html@main/files?period=year");
                const data = await response.json();
                data.forEach(file => {
                    const idMatch = file.name.match(/\/(\d+)\.html$/);
                    if (idMatch) {
                        const id = parseInt(idMatch[1]);
                        popularityData[id] = file.hits.total;
                    }
                });
            } catch (error) {
                popularityData[0] = 0;
            }
        }

        function sortZones() {
            const sortBy = sortOptions.value;
            if (sortBy === 'name') {
                zones.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortBy === 'id') {
                zones.sort((a, b) => a.id - b.id);
            } else if (sortBy === 'popular') {
                zones.sort((a, b) => (popularityData[b.id] || 0) - (popularityData[a.id] || 0));
            }
            zones.sort((a, b) => (a.id === -1 ? -1 : b.id === -1 ? 1 : 0));
            displayZones(zones);
        }

        function displayZones(zones) {
            container.innerHTML = "";
            zones.forEach(file => {
                const zoneItem = document.createElement("div");
                zoneItem.className = "zone-item";
                zoneItem.onclick = () => openZone(file);
                const img = document.createElement("img");
                img.src = file.cover.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
                zoneItem.appendChild(img);
                const button = document.createElement("button");
                button.textContent = file.name;
                button.onclick = (event) => {
                    event.stopPropagation();
                    openZone(file);
                };
                zoneItem.appendChild(button);
                container.appendChild(zoneItem);
            });
            if (container.innerHTML === "") {
                container.innerHTML = "No zones found.";
            } else {
                document.getElementById("zoneCount").textContent = `Zones Loaded: ${zones.length}`;
            }
        }

        function filterZones() {
            const query = searchBar.value.toLowerCase();
            const filteredZones = zones.filter(zone => zone.name.toLowerCase().includes(query));
            displayZones(filteredZones);
        }

        function openZone(file) {
            if (file.url.startsWith("http")) {
                window.open(file.url, "_blank");
            } else {
                const url = file.url.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
                fetch(url+"?t="+Date.now()).then(response => response.text()).then(html => {
                    if (zoneFrame.contentDocument === null) {
                        zoneFrame = document.createElement("iframe");
                        zoneFrame.id = "zoneFrame";
                        zoneViewer.appendChild(zoneFrame);
                    }
                    zoneFrame.contentDocument.open();
                    zoneFrame.contentDocument.write(html);
                    zoneFrame.contentDocument.close();
                    document.getElementById('zoneName').textContent = file.name;
                    document.getElementById('zoneId').textContent = file.id;
                    document.getElementById('zoneAuthor').textContent = "by " + file.author;
                    if (file.authorLink) {
                        document.getElementById('zoneAuthor').href = file.authorLink;
                    }
                    zoneViewer.style.display = "block";
                }).catch(error => alert("Failed to load zone: " + error));
            }
        }

        function aboutBlank() {
            const newWindow = window.open("about:blank", "_blank");
            let zone = zones.find(zone => zone.id + '' === document.getElementById('zoneId').textContent).url.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
            fetch(zone+"?t="+Date.now()).then(response => response.text()).then(html => {
                if (newWindow) {
                    newWindow.document.open();
                    newWindow.document.write(html);
                    newWindow.document.close();
                }
            })
        }

        function closeZone() {
            zoneViewer.style.display = "none";
            zoneViewer.removeChild(zoneFrame);
        }

        function downloadZone() {
            let zone = zones.find(zone => zone.id + '' === document.getElementById('zoneId').textContent);
            fetch(zone.url.replace("{HTML_URL}", htmlURL)+"?t="+Date.now()).then(res => res.text()).then(text => {
                const blob = new Blob([text], {
                    type: "text/plain;charset=utf-8"
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = zone.name + ".html";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }

        function fullscreenZone() {
            if (zoneFrame.requestFullscreen) {
                zoneFrame.requestFullscreen();
            } else if (zoneFrame.mozRequestFullScreen) {
                zoneFrame.mozRequestFullScreen();
            } else if (zoneFrame.webkitRequestFullscreen) {
                zoneFrame.webkitRequestFullscreen();
            } else if (zoneFrame.msRequestFullscreen) {
                zoneFrame.msRequestFullscreen();
            }
        }

        function saveData() {
            let data = JSON.stringify(localStorage) + "\n\n|\n\n" + document.cookie;
            const link = document.createElement("a");
            link.href = URL.createObjectURL(new Blob([data], {
                type: "text/plain"
            }));
            link.download = `${Date.now()}.data`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function loadData(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
                const content = e.target.result;
                const [localStorageData, cookieData] = content.split("\n\n|\n\n");
                try {
                    const parsedData = JSON.parse(localStorageData);
                    for (let key in parsedData) {
                        localStorage.setItem(key, parsedData[key]);
                    }
                } catch (error) {
                }
                if (cookieData) {
                    const cookies = cookieData.split("; ");
                    cookies.forEach(cookie => {
                        document.cookie = cookie;
                    });
                }
                alert("Data loaded");
            };
            reader.readAsText(file);
        }

        function darkMode() {
            document.body.classList.toggle("dark-mode");
        }

        function cloakIcon(url) {
            const link = document.querySelector("link[rel~='icon']");
            link.rel = "icon";
            if ((url+"").trim().length === 0) {
                link.href = "favicon.png";
            } else {
                link.href = url;
            }
            document.head.appendChild(link);
        }
        function cloakName(string) {
            if ((string+"").trim().length === 0) {
                document.title = "gn-math";
                return;
            }
            document.title = string;
        }

        function tabCloak() {
            closePopup();
            document.getElementById('popupTitle').textContent = "Tab Cloak";
            const popupBody = document.getElementById('popupBody');
            popupBody.innerHTML = `
                <label for="tab-cloak-textbox" style="font-weight: bold;">Set Tab Title:</label><br>
                <input type="text" id="tab-cloak-textbox" placeholder="Enter new tab name..." oninput="cloakName(this.value)">
                <br><br><br><br>
                <label for="tab-cloak-textbox" style="font-weight: bold;">Set Tab Icon:</label><br>
                <input type="text" id="tab-cloak-textbox" placeholder="Enter new tab icon..." oninput='cloakIcon(this.value)'>
                <br><br><br>
            `;
            popupBody.contentEditable = false;
            document.getElementById('popupOverlay').style.display = "flex";
        }

        const settings = document.getElementById('settings');
        settings.addEventListener('click', () => {
            document.getElementById('popupTitle').textContent = "Settings";
            const popupBody = document.getElementById('popupBody');
            popupBody.innerHTML = `
            <button id="settings-button" onclick="darkMode()">Toggle Dark Mode</button>
            <br><br>
            <button id="settings-button" onclick="tabCloak()">Tab Cloak</button>
            <br>
            `;
            popupBody.contentEditable = false;
            document.getElementById('popupOverlay').style.display = "flex";
        });

        function showContact() {
            document.getElementById('popupTitle').textContent = "Contact";
            const popupBody = document.getElementById('popupBody');
            popupBody.innerHTML = `<p>Discord: https://discord.gg/NAFw4ykZ7n</p>`;
            popupBody.contentEditable = false;
            document.getElementById('popupOverlay').style.display = "flex";
        }

        function loadPrivacy() {
            document.getElementById('popupTitle').textContent = "Privacy Policy";
            const popupBody = document.getElementById('popupBody');
            popupBody.innerHTML = `
                <div style="max-height: 60vh; overflow-y: auto;">
                    <h2>PRIVACY POLICY</h2>
                    <p>Last updated April 17, 2025</p>
                    <p>This Privacy Notice for gn-math ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:</p>
                    <ul>
                        <li>Visit our website at <a href="https://gn-math.github.io">https://gn-math.github.io</a>, or any website of ours that links to this Privacy Notice</li>
                        <li>Engage with us in other related ways, including any sales, marketing, or events</li>
                    </ul>
                    <p>Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <a href="https://discord.gg/NAFw4ykZ7n">https://discord.gg/NAFw4ykZ7n</a>.</p>
                    
                    <h3>SUMMARY OF KEY POINTS</h3>
                    <p>This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.</p>
                    
                    <p><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use. Learn more about personal information you disclose to us.</p>
                    
                    <p><strong>Do we process any sensitive personal information?</strong> Some of the information may be considered "special" or "sensitive" in certain jurisdictions, for example your racial or ethnic origins, sexual orientation, and religious beliefs. We do not process sensitive personal information.</p>
                    
                    <p><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</p>
                    
                    <p><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent. We process your information only when we have a valid legal reason to do so. Learn more about how we process your information.</p>
                    
                    <p><strong>In what situations and with which parties do we share personal information?</strong> We may share information in specific situations and with specific third parties. Learn more about when and with whom we share your personal information.</p>
                    
                    <p><strong>How do we keep your information safe?</strong> We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Learn more about how we keep your information safe.</p>
                    
                    <p><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information. Learn more about your privacy rights.</p>
                    
                    <p><strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by submitting a data subject access request, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.</p>
                </div>
            `;
            popupBody.contentEditable = false;
            document.getElementById('popupOverlay').style.display = "flex";
        }

        function closePopup() {
            document.getElementById('popupOverlay').style.display = "none";
        }
        listZones();