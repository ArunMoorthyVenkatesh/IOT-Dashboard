import React from "react";
import Modal from "react-modal";
import "./GenerateReportModal.css";

Modal.setAppElement("#root");

const GenerateReportModal = ({
  isOpen,
  onRequestClose,
  data,
  accessList,
  openLog,
  projectId,
  deviceId,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Report Modal"
      className="report-modal"
      overlayClassName="report-modal-overlay"
    >
      <h2>{projectId} Report</h2>
      <p><strong>Device ID:</strong> {deviceId}</p>

      <section>
        <h3>🔹 IoT Live Data</h3>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </section>

      <section>
        <h3>🔐 Access List</h3>
        <ul>
          {accessList?.length ? accessList.map((user, index) => (
            <li key={index}>{user.email}</li>
          )) : <li>No access records found.</li>}
        </ul>
      </section>

      <section>
        <h3>🕒 Activity Log</h3>
        <ul>
          {openLog?.length ? openLog.map((entry, index) => (
            <li key={index}>
              {entry.email} opened on {new Date(entry.timestamp).toLocaleString()}
            </li>
          )) : <li>No activity logs yet.</li>}
        </ul>
      </section>

      <button className="close-btn" onClick={onRequestClose}>Close</button>
    </Modal>
  );
};

export default GenerateReportModal;
