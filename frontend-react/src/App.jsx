import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState(null);
  const [medications, setMedications] = useState([]);
  const [doseHistory, setDoseHistory] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [fitnessActivities, setFitnessActivities] = useState([]);
  const [fitnessSummary, setFitnessSummary] = useState(null);
  const [goalProgress, setGoalProgress] = useState([]);
  const [fitnessMessage, setFitnessMessage] = useState("");
  const [savingFitness, setSavingFitness] = useState(false);
  const [fitnessForm, setFitnessForm] = useState({
    activity_type: "walking",
    duration_minutes: "",
    steps: "",
    distance_km: "",
    calories_burned: "",
    sleep_hours: "",
    notes: ""
  });

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [apiStatus, setApiStatus] = useState("Checking...");

  // Check API connection
  const checkAPI = async () => {
    try {
      const response = await fetch(`${API}/health`);

      if (!response.ok) {
        throw new Error("API error");
      }

      const data = await response.json();

      if (data.status === "healthy") {
        setApiStatus("Connected");
      } else {
        setApiStatus("Error");
      }
    } catch (error) {
      console.error("API connection error:", error);
      setApiStatus("Connection failed");
    }
  };

  // Load dashboard data
  const loadDashboard = async () => {
    try {
      
      const [
        summaryResponse,
        analyticsResponse,
        insightsResponse,
        medicationsResponse,
        doseResponse,
        metricsResponse,
        fitnessResponse,
        fitnessSummaryResponse,
        goalProgressResponse
      ] = await Promise.all([
        fetch(`${API}/health/summary`),
        fetch(`${API}/analytics`),
        fetch(`${API}/insights`),
        fetch(`${API}/medications`),
        fetch(`${API}/dose-history`),
        fetch(`${API}/health-metrics`),
        fetch(`${API}/fitness-activities`),
        fetch(`${API}/fitness-summary`),
        fetch(`${API}/health-goals/progress`)
      ]);


      if (summaryResponse.ok) {
        setSummary(await summaryResponse.json());
      }

      if (analyticsResponse.ok) {
        setAnalytics(await analyticsResponse.json());
      }

      if (insightsResponse.ok) {
        setInsights(await insightsResponse.json());
      }

      if (medicationsResponse.ok) {
        setMedications(await medicationsResponse.json());
      }

      if (doseResponse.ok) {
        setDoseHistory(await doseResponse.json());
      }

      if (metricsResponse.ok) {
        setMetrics(await metricsResponse.json());
      }

      if (fitnessResponse.ok) {
        setFitnessActivities(await fitnessResponse.json());
      }

      if (fitnessSummaryResponse.ok) {
        setFitnessSummary(await fitnessSummaryResponse.json());
      }

      if (goalProgressResponse.ok) {
      setGoalProgress(await goalProgressResponse.json());
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    }
  };

  // Add a fitness activity
  const addFitnessActivity = async (event) => {
    event.preventDefault();
    setFitnessMessage("");

    const numericFields = [
      "duration_minutes",
      "steps",
      "distance_km",
      "calories_burned",
      "sleep_hours"
    ];

    const hasMeasurement = numericFields.some(
      (field) => fitnessForm[field] !== ""
    );

    if (!fitnessForm.activity_type.trim()) {
      setFitnessMessage("Please enter an activity type.");
      return;
    }

    if (!hasMeasurement) {
      setFitnessMessage("Enter at least one fitness measurement.");
      return;
    }

    const payload = {
      activity_type: fitnessForm.activity_type.trim(),
      duration_minutes: fitnessForm.duration_minutes === "" ? null : Number(fitnessForm.duration_minutes),
      steps: fitnessForm.steps === "" ? null : Number(fitnessForm.steps),
      distance_km: fitnessForm.distance_km === "" ? null : Number(fitnessForm.distance_km),
      calories_burned: fitnessForm.calories_burned === "" ? null : Number(fitnessForm.calories_burned),
      sleep_hours: fitnessForm.sleep_hours === "" ? null : Number(fitnessForm.sleep_hours),
      notes: fitnessForm.notes.trim()
    };

    setSavingFitness(true);

    try {
      const response = await fetch(`${API}/fitness-activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not save fitness activity.");
      }

      setFitnessMessage("Fitness activity saved successfully.");
      setFitnessForm({
        activity_type: "walking",
        duration_minutes: "",
        steps: "",
        distance_km: "",
        calories_burned: "",
        sleep_hours: "",
        notes: ""
      });

      await loadDashboard();
    } catch (error) {
      console.error("Fitness activity error:", error);
      setFitnessMessage(error.message || "Unable to save fitness activity. Check that the backend is running.");
    } finally {
      setSavingFitness(false);
    }
  };

  // Ask AI
  const askAI = async () => {
    if (!question.trim()) {
      return;
    }

    setLoadingAI(true);
    setAnswer("");

    try {
      const response = await fetch(`${API}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: question
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      setAnswer(data.answer);
    } catch (error) {
      console.error("AI error:", error);
      setAnswer(
        "Unable to connect to health assistant AI. Please check your internet connection and try again."
      );
    } finally {
      setLoadingAI(false);
    }
  };

  // Voice input
  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setQuestion(text);
    };

    recognition.onerror = (event) => {
      console.error("Voice error:", event.error);
    };

    recognition.start();
  };

  // Load everything when page opens
  useEffect(() => {
    checkAPI();
    loadDashboard();
  }, []);

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div>
          <h1>Smart Health Assistant</h1>
          <p>AI-powered health monitoring dashboard</p>
        </div>

        <div className="api-status">
          <span
            className={
              apiStatus === "Connected"
                ? "status-dot connected"
                : "status-dot"
            }
          ></span>

          API Status: {apiStatus}
        </div>
      </header>

      {/* Main */}
      <main className="container">

        {/* Analytics */}
        <section>
          <h2>Health Overview</h2>

          <div className="cards">

            <div className="card">
              <h3>Active Medications</h3>
              <p className="number">
                {summary?.active_medications ?? 0}
              </p>
            </div>

            <div className="card">
              <h3>Doses Recorded</h3>
              <p className="number">
                {summary?.dose_records ?? 0}
              </p>
            </div>

            <div className="card">
              <h3>Health Metrics</h3>
              <p className="number">
                {summary?.health_metric_records ?? 0}
              </p>
            </div>

            <div className="card">
              <h3>Total Records</h3>
              <p className="number">
                {analytics
                  ? analytics.total_doses_recorded +
                    analytics.total_health_metrics
                  : 0}
              </p>
            </div>

          </div>
        </section>

        {/* AI Chat */}
        <section className="panel">
          <h2>AI Health Assistant</h2>

          <p className="description">
            Ask the health assistant about your stored health information,
            medications, or health-related questions.
          </p>

          <div className="chat-box">

            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something like: What medications do I have?"
              rows="4"
            />

            <div className="button-row">

              <button onClick={startVoice}>
                🎤 Voice
              </button>

              <button
                onClick={askAI}
                disabled={loadingAI}
              >
                {loadingAI ? "Thinking..." : "Ask AI"}
              </button>

            </div>

          </div>

          {answer && (
            <div className="answer">
              <h3>AI Response</h3>
              <p>{answer}</p>
            </div>
          )}
        </section>

        {/* Insights */}
        <section className="panel">
          <h2>Health Insights</h2>

          {insights?.insights?.length > 0 ? (
            <ul>
              {insights.insights.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No insights available.</p>
          )}
        </section>

        {/* Medications */}
        <section className="panel">
          <h2>Current Medications</h2>

          {medications.length === 0 ? (
            <p>No active medications recorded.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Dosage</th>
                    <th>Time</th>
                  </tr>
                </thead>

                <tbody>
                  {medications.map((medicine) => (
                    <tr key={medicine.id}>
                      <td>{medicine.name}</td>
                      <td>{medicine.dosage || "-"}</td>
                      <td>{medicine.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Dose History */}
        <section className="panel">
          <h2>Recent Dose History</h2>

          {doseHistory.length === 0 ? (
            <p>No dose records available.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Taken At</th>
                  </tr>
                </thead>

                <tbody>
                  {doseHistory.slice(0, 10).map((dose) => (
                    <tr key={dose.id}>
                      <td>{dose.name}</td>
                      <td>{dose.dosage || "-"}</td>
                      <td>{dose.taken_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Health Metrics */}
        <section className="panel">
          <h2>Recent Health Metrics</h2>

          {metrics.length === 0 ? (
            <p>No health metrics recorded.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Recorded At</th>
                  </tr>
                </thead>

                <tbody>
                  {metrics.slice(0, 10).map((metric) => (
                    <tr key={metric.id}>
                      <td>{metric.metric_type}</td>
                      <td>{metric.value}</td>
                      <td>{metric.unit || "-"}</td>
                      <td>{metric.recorded_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Fitness Tracking */}
        <section className="panel">
          <h2>Fitness Tracking</h2>
          <p className="description">
            Record your activity and view previously saved fitness measurements.
          </p>

          <form onSubmit={addFitnessActivity} className="fitness-form">
            <label>
              Activity type *
              <input
                type="text"
                value={fitnessForm.activity_type}
                onChange={(e) => setFitnessForm({ ...fitnessForm, activity_type: e.target.value })}
                placeholder="e.g. walking, running, cycling"
                required
              />
            </label>

            <div className="cards">
              <label className="card">
                Duration (minutes)
                <input type="number" min="0" max="1440" step="1" value={fitnessForm.duration_minutes}
                  onChange={(e) => setFitnessForm({ ...fitnessForm, duration_minutes: e.target.value })} />
              </label>
              <label className="card">
                Steps
                <input type="number" min="0" max="200000" step="1" value={fitnessForm.steps}
                  onChange={(e) => setFitnessForm({ ...fitnessForm, steps: e.target.value })} />
              </label>
              <label className="card">
                Distance (km)
                <input type="number" min="0" max="1000" step="0.1" value={fitnessForm.distance_km}
                  onChange={(e) => setFitnessForm({ ...fitnessForm, distance_km: e.target.value })} />
              </label>
              <label className="card">
                Calories burned
                <input type="number" min="0" max="20000" step="1" value={fitnessForm.calories_burned}
                  onChange={(e) => setFitnessForm({ ...fitnessForm, calories_burned: e.target.value })} />
              </label>
              <label className="card">
                Sleep (hours)
                <input type="number" min="0" max="24" step="0.1" value={fitnessForm.sleep_hours}
                  onChange={(e) => setFitnessForm({ ...fitnessForm, sleep_hours: e.target.value })} />
              </label>
            </div>

            <label>
              Notes (optional)
              <textarea rows="2" maxLength="500" value={fitnessForm.notes}
                onChange={(e) => setFitnessForm({ ...fitnessForm, notes: e.target.value })}
                placeholder="Optional notes" />
            </label>

            <button type="submit" disabled={savingFitness}>
              {savingFitness ? "Saving..." : "Save Fitness Activity"}
            </button>
            {fitnessMessage && <p role="status">{fitnessMessage}</p>}
          </form>

          
          <h3>Fitness Summary</h3>

          <div className="cards">
            <div className="card">
            <h3>Total Activities</h3>
            <p className="number">
              {fitnessSummary?.total_activities ?? 0}
            </p>
            </div>

            <div className="card">
            <h3>Total Steps</h3>
            <p className="number">
              {fitnessSummary?.total_steps ?? 0}
            </p>
            </div>

            <div className="card">
              <h3>Total Duration (min)</h3>
              <p className="number">
                {fitnessSummary?.total_duration_minutes ?? 0}
              </p>
            </div>

            <div className="card">
              <h3>Total Distance (km)</h3>
              <p className="number">
                {Number(fitnessSummary?.total_distance_km ?? 0).toFixed(1)}
              </p>
            </div>

            <div className="card">
              <h3>Total Calories</h3>
              <p className="number">
                {fitnessSummary?.total_calories ?? 0}
              </p>
            </div>

            <div className="card">
              <h3>Total Sleep (hrs)</h3>
              <p className="number">
                {Number(fitnessSummary?.total_sleep_hours ?? 0).toFixed(1)}
              </p>
            </div>
          </div>


          <h3>Recent Fitness Activities</h3>
          {fitnessActivities.length === 0 ? (
            <p>No fitness activities recorded yet.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Duration (min)</th>
                    <th>Steps</th>
                    <th>Distance (km)</th>
                    <th>Calories</th>
                    <th>Sleep (hrs)</th>
                    <th>Recorded At</th>
                  </tr>
                </thead>
                <tbody>
                  {fitnessActivities.slice(0, 10).map((activity) => (
                    <tr key={activity.id}>
                      <td>{activity.activity_type}</td>
                      <td>{activity.duration_minutes ?? "-"}</td>
                      <td>{activity.steps ?? "-"}</td>
                      <td>{activity.distance_km ?? "-"}</td>
                      <td>{activity.calories_burned ?? "-"}</td>
                      <td>{activity.sleep_hours ?? "-"}</td>
                      <td>{activity.recorded_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

                      

                       
        {/* Health Goal Progress */}
        <section className="panel">
          <h2>Health Goal Progress</h2>

          {goalProgress.length === 0 ? (
            <p>No health goals added yet.</p>
          ) : (
            <div className="cards">
              {goalProgress.map((goal) => (
              <div className="card" key={goal.id}>
                <h3>
                {goal.goal_type.charAt(0).toUpperCase() +
                goal.goal_type.slice(1)}
                </h3>

                <p>
                  Progress: {goal.current_value} / {goal.target_value}{" "}
                  {goal.unit}
                </p>

                <progress
                  value={goal.progress_percent}
                  max="100"
                  style={{ width: "100%" }}
                />

                <p>{goal.progress_percent}% completed</p>

                <p>
                 {goal.completed ? "Goal completed!" : "In progress"}
                </p>
              </div>
             ))}
            </div>
          )}
        </section>

        {/* Refresh */}
        <div className="refresh-section">
          <button
            onClick={() => {
              checkAPI();
              loadDashboard();
            }}
          >
            🔄 Refresh Dashboard
          </button>
        </div>

      </main>

      {/* Footer */}
      <footer>
        <p>
          Smart Health Assistant — Track B Advanced Health-Tech Project
        </p>
      </footer>

    </div>
  );
}

export default App;