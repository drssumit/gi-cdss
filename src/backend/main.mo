import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Order "mo:core/Order";

actor {
  type Doctor = {
    principal : Principal;
    name : Text;
    clinic : Text;
    email : Text;
  };

  module Doctor {
    public func compare(doctor1 : Doctor, doctor2 : Doctor) : Order.Order {
      Text.compare(doctor1.name, doctor2.name);
    };

    public func compareByClinic(doctor1 : Doctor, doctor2 : Doctor) : Order.Order {
      Text.compare(doctor1.clinic, doctor2.clinic);
    };
  };

  type PatientSession = {
    id : Nat;
    doctorId : Principal;
    language : Text;
    answers : [(Nat, Text)];
    completedAt : ?Time.Time;
  };

  module PatientSession {
    public func compare(session1 : PatientSession, session2 : PatientSession) : Order.Order {
      compareByDate(session1, session2);
    };

    public func compareByDoctor(session1 : PatientSession, session2 : PatientSession) : Order.Order {
      switch (Text.compare(session1.language, session2.language)) {
        case (#equal) {
          compareByDate(session1, session2);
        };
        case (order) { order };
      };
    };

    public func compareByDate(session1 : PatientSession, session2 : PatientSession) : Order.Order {
      switch (session1.completedAt, session2.completedAt) {
        case (null, null) { #equal };
        case (null, _) { #greater };
        case (_, null) { #less };
        case (?time1, ?time2) {
          compareTime (time1, time2);
        };
      };
    };

    public func compareTime(time1 : Time.Time, time2 : Time.Time) : Order.Order {
      if (time1 < time2) { #less } else if (time1 > time2) { #greater } else {
        #equal;
      };
    };
  };

  var nextPatientSessionId = 0;

  let doctors = Map.empty<Principal, Doctor>();
  let patientSessions = Map.empty<Nat, PatientSession>();

  public shared ({ caller }) func registerDoctor(name : Text, clinic : Text, email : Text) : async () {
    if (doctors.containsKey(caller)) { Runtime.trap("This doctor is already registered.") };
    let doctor : Doctor = {
      principal = caller;
      name;
      clinic;
      email;
    };
    doctors.add(caller, doctor);
  };

  public query ({ caller }) func getDoctor(doctorId : Principal) : async Doctor {
    switch (doctors.get(doctorId)) {
      case (null) { Runtime.trap("Doctor does not exist") };
      case (?doctor) { doctor };
    };
  };

  public query ({ caller }) func getAllDoctors() : async [Doctor] {
    doctors.values().toArray().sort();
  };

  public shared ({ caller }) func createPatientSession(doctorId : Principal, language : Text) : async Nat {
    let sessionId = nextPatientSessionId;
    nextPatientSessionId += 1;

    let session : PatientSession = {
      id = sessionId;
      doctorId;
      language;
      answers = [];
      completedAt = null;
    };

    patientSessions.add(sessionId, session);
    sessionId;
  };

  public shared ({ caller }) func answerQuestion(sessionId : Nat, questionId : Nat, answer : Text) : async () {
    let session = switch (patientSessions.get(sessionId)) {
      case (null) { Runtime.trap("Session does not exist") };
      case (?s) { s };
    };

    let answersMap = Map.fromIter<Nat, Text>(session.answers.values());
    answersMap.add(questionId, answer);
    let newAnswers = answersMap.toArray();
    let newSession : PatientSession = {
      id = session.id;
      doctorId = session.doctorId;
      language = session.language;
      answers = newAnswers;
      completedAt = session.completedAt;
    };

    patientSessions.add(sessionId, newSession);
  };

  public shared ({ caller }) func completeSession(sessionId : Nat) : async () {
    let session = switch (patientSessions.get(sessionId)) {
      case (null) { Runtime.trap("Session does not exist") };
      case (?s) { s };
    };

    let newSession : PatientSession = {
      id = session.id;
      doctorId = session.doctorId;
      language = session.language;
      answers = session.answers;
      completedAt = ?Time.now();
    };

    patientSessions.add(sessionId, newSession);
  };

  public query ({ caller }) func getSessionsByDoctor(doctorId : Principal) : async [PatientSession] {
    let sessions = List.empty<PatientSession>();
    let entries = patientSessions.entries();
    for ((_, session) in entries) {
      if (session.doctorId == doctorId) {
        sessions.add(session);
      };
    };
    sessions.values().toArray();
  };

  public query ({ caller }) func getPatientSession(sessionId : Nat) : async PatientSession {
    switch (patientSessions.get(sessionId)) {
      case (null) { Runtime.trap("Session does not exist") };
      case (?session) { session };
    };
  };
};
