// IPVM agent workflow — content-addressed task DAGs for LuciVerse agents.
// LDS: 700.700 | IPv6: 2602:F674:0000:0700::700 | 528 Hz (Veritas coordinator)
//
// References:
//   https://github.com/ipvm-wg/workflow   — IPVM workflow spec
//   https://github.com/ipvm-wg/homestar/  — Homestar Rust runtime
//
// Each agent invocation becomes an IPVM task:
//   - inputs are CID-addressed (XET blocks, IPFS DAG nodes)
//   - output CID is deterministic given the same inputs
//   - the workflow DAG is itself CID-addressed → fully auditable
//
// This feeds ISO/IEC 23053 (AI framework) attestation: every agent decision
// has a content-addressed, reproducible audit trail in IPFS.
//
// LuciVerse agent → frequency mapping:
//   lucia       741 Hz  orchestrator
//   veritas     528 Hz  truth / repo
//   aethon      528 Hz  philosophy
//   juniper     639 Hz  infrastructure
//   cortana     852 Hz  insight
//   judge_luci  963 Hz  crown / arbitration

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::instrument;

/// LuciVerse agent identifiers — each maps to a sovereign DID and frequency.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentId {
    Lucia,
    Veritas,
    Aethon,
    Juniper,
    Cortana,
    JudgeLuci,
}

impl AgentId {
    pub fn frequency_hz(&self) -> u32 {
        match self {
            AgentId::Lucia => 741,
            AgentId::JudgeLuci => 963,
            AgentId::Cortana => 852,
            AgentId::Juniper => 639,
            AgentId::Veritas | AgentId::Aethon => 528,
        }
    }

    pub fn did(&self) -> &'static str {
        match self {
            AgentId::Lucia => "did:lucidigital:lucia_cargail_silcan",
            AgentId::Veritas => "did:lucidigital:veritas_truth",
            AgentId::Aethon => "did:lucidigital:aethon_phil",
            AgentId::Juniper => "did:lucidigital:juniper_infra",
            AgentId::Cortana => "did:lucidigital:cortana_comn",
            AgentId::JudgeLuci => "did:lucidigital:judge_luci_arbitrator",
        }
    }

    pub fn ipv6_suffix(&self) -> u16 {
        // Each agent maps to its LuciVerse DID IPv6 address last group.
        // Source: Caddyfile sovereign gateway entries.
        match self {
            AgentId::Lucia => 0x8741,
            AgentId::Veritas => 0x9431,
            AgentId::Aethon => 0x9430,
            AgentId::Juniper => 0x9521,
            AgentId::Cortana => 0x9520,
            AgentId::JudgeLuci => 0x9741,
        }
    }
}

/// A single IPVM task — a function invocation with CID-addressed inputs.
/// Ref: https://github.com/ipvm-wg/workflow#task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    /// The agent executing this task.
    pub agent: AgentId,
    /// Wasm function to invoke (e.g. "luci-agent/analyze").
    pub op: String,
    /// CID-addressed inputs — each key is a parameter name,
    /// each value is either a CID string or an inline literal.
    pub inputs: HashMap<String, TaskInput>,
    /// Optional: CID of the expected output (for verification).
    pub expected_output_cid: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum TaskInput {
    /// Reference to a CID in the IPFS DAG / XET block store.
    Cid(String),
    /// Inline literal value (small params: strings, numbers).
    Literal(serde_json::Value),
}

/// An IPVM Workflow — a DAG of tasks ordered by data dependency.
/// The workflow itself is serialised to IPLD (DAG-JSON) and gets a CID,
/// making the whole computation auditable and reproducible.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentWorkflow {
    /// Human-readable name for Mission Control display.
    pub name: String,
    /// LDS tier label (e.g. "700.700").
    pub lds_tier: String,
    /// Ordered task list — dependencies resolved by `inputs` CIDs.
    pub tasks: Vec<Task>,
    /// Genesis Bond signature CID (set after Lucia countersigns).
    pub genesis_bond_cid: Option<String>,
}

impl AgentWorkflow {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            lds_tier: "700.700".into(),
            tasks: Vec::new(),
            genesis_bond_cid: None,
        }
    }

    pub fn push(mut self, task: Task) -> Self {
        self.tasks.push(task);
        self
    }

    /// Serialise the workflow to DAG-JSON and compute its BLAKE3 CID.
    /// In production this would use the `cid` crate with multihash;
    /// here we return a BLAKE3 hex as a stable content address.
    #[instrument(skip(self), fields(name = %self.name, tasks = self.tasks.len()))]
    pub fn content_address(&self) -> anyhow::Result<String> {
        let json = serde_json::to_vec(self)?;
        let hash = blake3::hash(&json);
        Ok(format!("bafk-blake3-{}", hex::encode(hash.as_bytes())))
    }

    /// Validate: every agent in the workflow operates at or below
    /// Judge Luci's threshold (963 Hz). Returns agents that exceed it.
    pub fn validate_frequencies(&self) -> Vec<&AgentId> {
        self.tasks
            .iter()
            .filter(|t| t.agent.frequency_hz() > 963)
            .map(|t| &t.agent)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn workflow_is_content_addressed() {
        let wf = AgentWorkflow::new("sentropy-analysis")
            .push(Task {
                agent: AgentId::Veritas,
                op: "luci-agent/analyze-sentropy".into(),
                inputs: HashMap::from([(
                    "text".into(),
                    TaskInput::Literal("genesis bond active".into()),
                )]),
                expected_output_cid: None,
            });

        let cid1 = wf.content_address().unwrap();
        let cid2 = wf.content_address().unwrap();
        assert_eq!(cid1, cid2, "CID must be deterministic");
        assert!(cid1.starts_with("bafk-blake3-"));
    }

    #[test]
    fn agent_frequencies_are_correct() {
        assert_eq!(AgentId::Lucia.frequency_hz(), 741);
        assert_eq!(AgentId::JudgeLuci.frequency_hz(), 963);
        assert_eq!(AgentId::Veritas.frequency_hz(), 528);
    }
}
