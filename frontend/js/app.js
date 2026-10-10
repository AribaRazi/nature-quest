const API_BASE = "http://127.0.0.1:8000";

let selectedDuration = 15;
let selectedEnergy = "medium";
let currentQuestId = null;

const $ = id => document.getElementById(id);

console.log("APP.JS LOADED");


// ======================================================
// PREVENT ACCIDENTAL FORM / BUTTON SUBMISSION
// ======================================================

document.addEventListener("click", function (e) {
    const button = e.target.closest("button");

    if (button) {
        e.preventDefault();
    }
});


// ======================================================
// DURATION OPTIONS
// ======================================================

document.querySelectorAll(".choice").forEach(button => {
    button.addEventListener("click", function (e) {
        e.preventDefault();

        document.querySelectorAll(".choice").forEach(x => {
            x.classList.remove("active");
        });

        button.classList.add("active");

        selectedDuration = Number(button.dataset.value);
    });
});


// ======================================================
// ENERGY OPTIONS
// ======================================================

document.querySelectorAll(".energy-btn").forEach(button => {
    button.addEventListener("click", function (e) {
        e.preventDefault();

        document.querySelectorAll(".energy-btn").forEach(x => {
            x.classList.remove("active");
        });

        button.classList.add("active");

        selectedEnergy = button.dataset.value;
    });
});


// ======================================================
// DIFFICULTY SLIDER
// ======================================================

$("difficulty").addEventListener("input", function (e) {
    const value = Number(e.target.value);

    $("difficultyStars").textContent =
        "★".repeat(value) + "☆".repeat(5 - value);

    $("difficultyValue").textContent = `${value} / 5`;
});


// ======================================================
// GENERATE QUEST
// ======================================================

async function generateQuest() {

    const button = $("generateBtn");

    button.disabled = true;
    button.innerHTML = "✦ Gemma is thinking...";

    // Hide previous result while generating
    $("questResult").classList.add("hidden");
    $("reflectionCard").classList.add("hidden");

    try {

        const response = await fetch(
            `${API_BASE}/quests/generate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    duration: selectedDuration,
                    energy: selectedEnergy,
                    difficulty: Number($("difficulty").value)
                })
            }
        );

        if (!response.ok) {

            const errorText = await response.text();

            throw new Error(
                errorText || "Quest generation failed"
            );
        }

        const quest = await response.json();

        console.log("Gemma response:", quest);

        // Store quest ID for complete/reflection
        currentQuestId = quest.id;

        // Fill quest information
        $("questTitle").textContent = quest.title;

        $("questDescription").textContent =
            quest.description;

        $("questDuration").textContent =
            quest.duration;

        $("questDifficulty").textContent =
            quest.difficulty;

        $("questXp").textContent =
            `+${quest.xp} XP`;


        // IMPORTANT:
        // Show the generated quest and DO NOT hide it afterwards
        $("questResult").classList.remove("hidden");

        console.log(
            "Quest visible:",
            !$("questResult").classList.contains("hidden")
        );


        // Scroll to generated quest
        $("questResult").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    } catch (error) {

        console.error(
            "Quest generation error:",
            error
        );

        alert(
            error.message ||
            "Could not generate quest. Make sure FastAPI and Ollama are running."
        );

    } finally {

        button.disabled = false;

        button.innerHTML =
            '<span>✦</span> Generate my quest <b>→</b>';
    }
}


// ======================================================
// COMPLETE QUEST
// ======================================================

async function completeQuest() {

    if (!currentQuestId) {
        alert("Please generate a quest first.");
        return;
    }

    const button = $("completeBtn");

    button.disabled = true;

    try {

        const response = await fetch(
            `${API_BASE}/quests/${currentQuestId}/complete`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Could not complete quest"
            );
        }

        console.log("Quest completed:", data);

        // Show reflection section
        $("reflectionCard").classList.remove("hidden");

        $("reflectionCard").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        // Refresh stats/history
        await loadStats();
        await loadHistory();

    } catch (error) {

        console.error(
            "Complete quest error:",
            error
        );

        alert(
            error.message ||
            "Could not complete the quest."
        );

    } finally {

        button.disabled = false;
    }
}


// ======================================================
// SAVE REFLECTION
// ======================================================

async function saveReflection() {

    if (!currentQuestId) {
        alert("Please complete a quest first.");
        return;
    }

    const reflection =
        $("reflection").value.trim();

    if (!reflection) {
        $("reflection").focus();
        return;
    }

    const button = $("reflectBtn");

    button.disabled = true;
    button.textContent = "Gemma is reading...";

    try {

        const response = await fetch(
            `${API_BASE}/quests/${currentQuestId}/reflect`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    reflection: reflection
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Could not save reflection"
            );
        }

        console.log("Reflection response:", data);

        $("feedback").textContent =
            `${data.completed ? "✓ Quest verified. " : ""}` +
            `${data.feedback} ` +
            `+${data.bonus_xp} bonus XP`;

        $("feedback").classList.remove("hidden");

        // Refresh stats/history
        await loadStats();
        await loadHistory();

    } catch (error) {

        console.error(
            "Reflection error:",
            error
        );

        alert(
            error.message ||
            "Could not save reflection."
        );

    } finally {

        button.disabled = false;
        button.textContent = "Save reflection ↗";
    }
}


// ======================================================
// LOAD STATS
// ======================================================

async function loadStats() {

    try {

        const response =
            await fetch(`${API_BASE}/stats`);

        if (!response.ok) {
            throw new Error("Failed to load stats");
        }

        const stats =
            await response.json();

        console.log("Stats:", stats);

        $("levelBadge").textContent =
            stats.level;

        $("xpText").textContent =
            `${stats.xp_current_level} / 100 XP`;

        $("totalXp").textContent =
            `${stats.total_xp} total`;

        $("completed").textContent =
            stats.completed_quests;

        $("xpBar").style.width =
            `${stats.xp_current_level}%`;

        $("streak").textContent =
            stats.current_streak ?? stats.completed_quests;

        unlock(stats);

    } catch (error) {

        console.warn(
            "Could not load stats:",
            error
        );
    }
}


// ======================================================
// BADGES
// ======================================================

function unlock(stats) {

    $("badge1").classList.toggle(
        "unlocked",
        stats.completed_quests >= 1
    );

    $("badge2").classList.toggle(
        "unlocked",
        stats.completed_quests >= 5
    );

    $("badge3").classList.toggle(
        "unlocked",
        stats.total_xp >= 100
    );

    $("badge4").classList.toggle(
        "unlocked",
        stats.completed_quests >= 3
    );
}


// ======================================================
// LOAD QUEST HISTORY
// ======================================================

async function loadHistory() {
    const historyList = document.getElementById("historyList");

    if (!historyList) {
        console.error("historyList element not found in index.html");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/quests`);

        if (!response.ok) {
            throw new Error("Failed to load quest history");
        }

        const quests = await response.json();

        if (!quests.length) {
            historyList.innerHTML = `
                <p class="empty-history">
                    No quests yet. Start exploring!
                </p>
            `;
            return;
        }

        historyList.innerHTML = quests.slice(0, 8).map(quest => `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-title">
                        ${escapeHtml(quest.title)}
                    </div>
                    <div class="history-date">
                        ${escapeHtml(quest.status)} · ${quest.duration} min
                    </div>
                </div>

                <div class="history-actions">
                    <div class="history-xp">
                        +${quest.status === "completed" ? quest.xp : 0} XP
                    </div>
                    <button
                        type="button"
                        class="delete-quest-btn"
                        data-quest-id="${quest.id}"
                        aria-label="Delete ${escapeHtml(quest.title)}"
                    >
                        Delete
                    </button>
                </div>
            </div>
        `).join("");

        historyList.querySelectorAll(".delete-quest-btn")
            .forEach(button => {
                button.addEventListener("click", async () => {
                    const questId = button.dataset.questId;

                    if (!confirm("Are you sure you want to delete this quest?")) {
                        return;
                    }

                    button.disabled = true;

                    try {
                        const deleteResponse = await fetch(
                            `${API_BASE}/quests/${questId}`,
                            { method: "DELETE" }
                        );

                        if (!deleteResponse.ok) {
                            const error = await deleteResponse.json();
                            throw new Error(
                                error.detail || "Could not delete quest"
                            );
                        }

                        await loadHistory();
                        await loadStats();

                    } catch (error) {
                        console.error("Delete error:", error);
                        alert(error.message || "Failed to delete quest.");
                        button.disabled = false;
                    }
                });
            });

    } catch (error) {
        console.error("History loading error:", error);
        historyList.innerHTML = "<p>Could not load quest history.</p>";
    }
}


const deleteButton = document.createElement("button");
deleteButton.textContent = "Delete";
deleteButton.className = "delete-quest-btn";

deleteButton.addEventListener("click", async (event) => {
    event.stopPropagation();

    const confirmed = confirm(
        "Are you sure you want to delete this quest?"
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${API_BASE}/quests/${quest.id}`,
            { method: "DELETE" }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to delete quest");
        }

        await loadHistory();
        await loadStats();
    } catch (error) {
        console.error("Delete quest error:", error);
        alert(error.message || "Could not delete the quest.");
    }
});

// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ======================================================
// NEW QUEST
// ======================================================

function startNewQuest() {

    $("questResult").classList.add("hidden");

    $("reflectionCard").classList.add("hidden");

    $("reflection").value = "";

    $("feedback").textContent = "";

    $("feedback").classList.add("hidden");

    currentQuestId = null;

    window.scrollTo({
        top:
            document.querySelector(".builder").offsetTop - 100,
        behavior: "smooth"
    });
}


// ======================================================
// BUTTON EVENT LISTENERS
// ======================================================

$("generateBtn").addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        generateQuest();
    }
);


$("completeBtn").addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        completeQuest();
    }
);


$("reflectBtn").addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        saveReflection();
    }
);


$("newQuestBtn").addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        startNewQuest();
    }
);


// ======================================================
// INITIAL LOAD
// ======================================================

loadStats();
loadHistory();