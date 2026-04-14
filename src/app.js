import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, 
  increment, arrayUnion, collection, query, where, getDocs 
} from "firebase/firestore";
import "./App.css"; // Link the CSS file

const firebaseConfig = {
  apiKey: "AIzaSyAla-j5XiDE8Dfx0WRf5T-S2omYydrnEiM",
  authDomain: "earnhub-e3c63.firebaseapp.com",
  projectId: "earnhub-e3c63",
  storageBucket: "earnhub-e3c63.firebasestorage.app",
  messagingSenderId: "236965383629",
  appId: "1:236965383629:web:89fbfe37ad12ad3ef9c884",
  measurementId: "G-9T6EHPKQ16"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("login");
  const [form, setForm] = useState({ name: "", phone: "", password: "", ref: "" });
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) { setForm(f => ({ ...f, ref })); setView("register"); }
  }, []);

  const handleAuth = async () => {
    if (!form.phone || !form.password) return showToast("Fill all details!");
    setLoading(true);
    try {
      const userRef = doc(db, "users", form.phone);
      const userSnap = await getDoc(userRef);

      if (view === "register") {
        if (userSnap.exists()) throw new Error("User exists!");
        const newUser = {
          name: form.name,
          phone: form.phone,
          password: form.password,
          balance: 0,
          activated: false,
          refCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
          referredBy: form.ref || null,
          activity: [{ msg: "Joined EarnHub!", at: new Date().toISOString() }]
        };
        await setDoc(userRef, newUser);
        setUser(newUser);
      } else {
        if (!userSnap.exists() || userSnap.data().password !== form.password) throw new Error("Wrong details!");
        setUser(userSnap.data());
      }
    } catch (e) { showToast(e.message); }
    setLoading(false);
  };

  const verifyPayment = async (code) => {
    if (!code) return showToast("Enter M-Pesa Code");
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.phone);
      await updateDoc(userRef, {
        activated: true,
        activity: arrayUnion({ msg: "Account Activated ✅", at: new Date().toISOString() })
      });

      if (user.referredBy) {
        const q = query(collection(db, "users"), where("refCode", "==", user.referredBy));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          await updateDoc(doc(db, "users", qSnap.docs[0].id), {
            balance: increment(20),
            activity: arrayUnion({ msg: `Referral bonus +20 from ${user.name}`, at: new Date().toISOString() })
          });
        }
      }
      setUser((await getDoc(userRef)).data());
      showToast("Activated successfully!");
    } catch (e) { showToast("System Error"); }
    setLoading(false);
  };

  if (!user) return (
    <div className="auth-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '380px' }}>
        <h1 style={{ textAlign: 'center', color: '#00d4aa' }}>💰 EarnHub</h1>
        {view === "register" && <input className="input-field" placeholder="Full Name" onChange={e => setForm({...form, name: e.target.value})} />}
        <input className="input-field" placeholder="Phone Number" onChange={e => setForm({...form, phone: e.target.value})} />
        <input className="input-field" type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
        {view === "register" && <input className="input-field" placeholder="Referral Code" value={form.ref} onChange={e => setForm({...form, ref: e.target.value})} />}
        <button className="primary-btn" onClick={handleAuth}>{loading ? "Wait..." : (view === "login" ? "Login" : "Register")}</button>
        <p style={{ textAlign: 'center', color: '#6b7a99', marginTop: '15px', cursor: 'pointer' }} onClick={() => setView(view === "login" ? "register" : "login")}>
          {view === "login" ? "Create Account" : "Back to Login"}
        </p>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );

  return (
    <div className="dashboard">
      <nav style={{ padding: '20px', borderBottom: '1px solid #1e2d45', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 'bold' }}>EARNHUB</span>
        <span style={{ color: '#00d4aa' }}>KSH {user.balance}</span>
      </nav>
      <div style={{ padding: '20px' }}>
        {!user.activated ? (
          <div className="activation-box">
            <h3>Activate Account</h3>
            <p style={{ color: '#6b7a99' }}>Pay 100/- to start earning and referring.</p>
            <a href="https://lipwa.link/7762" target="_blank" className="primary-btn" style={{ textDecoration: 'none', display: 'block' }}>PAY VIA LIPWA</a>
            <input id="mcode" className="input-field" style={{ marginTop: '15px' }} placeholder="Enter M-Pesa Code" />
            <button className="primary-btn" onClick={() => verifyPayment(document.getElementById('mcode').value)}>Verify Code</button>
          </div>
        ) : (
          <div className="active-dash">
            <h2>Welcome, {user.name}</h2>
            <div className="card">
              <p>Your Referral Link (KSH 20 per friend):</p>
              <code style={{ background: '#000', padding: '10px', display: 'block', borderRadius: '5px' }}>
                {window.location.origin}?ref={user.refCode}
              </code>
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
