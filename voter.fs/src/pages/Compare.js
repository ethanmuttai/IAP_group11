import React, { useState } from 'react';
import { candidateData } from '../data/mockData';
import SectionHeader from '../components/SectionHeader';
import { Container, Table, Form } from 'react-bootstrap';

const Compare = () => {

  const [selectedIds, setSelectedIds] = useState(["ruto", "kalonzo"]);

  const handleCheckboxChange = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter(item => item !== id));
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const activeCandidates = candidateData.filter(c => selectedIds.includes(c.id));

  return (
    <Container className="my-4">
      <SectionHeader
        category="Side-by-side"
        title="Compare stances"
        description="Pick up to four candidates and compare their operational backgrounds, fiscal policies, and manifestos side by side."
      />

      <div className="p-4 bg-white border rounded shadow-sm mb-5 text-start">
        <h6 className="fw-bold mb-3 text-muted text-uppercase" style={{ fontSize: '0.8rem' }}>
          Toggle Matrix Filter Rows
        </h6>
        <div className="d-flex flex-wrap gap-4">
          {candidateData.map(c => (
            <Form.Check
              type="checkbox"
              key={c.id}
              id={`check-${c.id}`}
              label={c.name}
              checked={selectedIds.includes(c.id)}
              onChange={() => handleCheckboxChange(c.id)}
              className="fw-bold text-dark m-0"
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>

      <div className="comparison-table border rounded bg-white">
        <Table responsive bordered className="m-0 align-middle">
          <thead>
            <tr>
              <th className="p-3" style={{ width: '220px', backgroundColor: '#fdfcfb' }}>Policy Field</th>
              {activeCandidates.map(c => (
                <th key={c.id} className="p-3 text-start" style={{ minWidth: '260px' }}>
                  <div className="fw-bold text-dark" style={{ fontSize: '1.1rem' }}>{c.name}</div>
                  <small className="text-muted fw-normal d-block mt-1">{c.party.split(' / ')[0]}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="text-start">
              <td className="p-3 fw-bold summary-span">Top Experience</td>
              {activeCandidates.map(c => <td key={c.id} className="p-3 small text-secondary" style={{ lineHeight: '1.6' }}>{c.experience}</td>)}
            </tr>
            <tr className="text-start">
              <td className="p-3 fw-bold summary-span">Economic Vision</td>
              {activeCandidates.map(c => <td key={c.id} className="p-3 small text-secondary" style={{ lineHeight: '1.6' }}>{c.vision}</td>)}
            </tr>
            <tr className="text-start">
              <td className="p-3 fw-bold summary-span">Taxation & Fiscal Policy</td>
              {activeCandidates.map(c => <td key={c.id} className="p-3 small text-secondary" style={{ lineHeight: '1.6' }}>{c.fiscal}</td>)}
            </tr>
            <tr className="text-start">
              <td className="p-3 fw-bold summary-span">Agriculture Support</td>
              {activeCandidates.map(c => <td key={c.id} className="p-3 small text-secondary" style={{ lineHeight: '1.6' }}>{c.agriculture}</td>)}
            </tr>
            <tr className="text-start">
              <td className="p-3 fw-bold summary-span">Governance & Devolution</td>
              {activeCandidates.map(c => <td key={c.id} className="p-3 small text-secondary" style={{ lineHeight: '1.6' }}>{c.governance}</td>)}
            </tr>
            <tr className="text-start">
              <td className="p-3 fw-bold summary-span">Cost of Living Measures</td>
              {activeCandidates.map(c => <td key={c.id} className="p-3 small text-secondary" style={{ lineHeight: '1.6' }}>{c.costOfLiving}</td>)}
            </tr>
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

export default Compare;