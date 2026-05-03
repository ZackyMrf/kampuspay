import { Link } from 'react-router-dom'
import './StudentHomePage.css'

export default function StudentHomePage() {
  return (
    <div className="page student-page">
      <div className="container">
        <section className="student-hero">
          <div>
            <span className="section-tag">Halaman Mahasiswa</span>
            <h1>Bayar kebutuhan kampus dari satu halaman biasa.</h1>
            <p>
              Mahasiswa bisa membuka marketplace, memilih item kampus, lalu membayar payment
              link yang dibuat admin melalui Solana Devnet.
            </p>
            <div className="student-actions">
              <Link to="/marketplace" className="btn btn-primary btn-lg">Buka Marketplace</Link>
            </div>
          </div>

          <div className="student-info">
            <div className="student-info-row">
              <span>Role</span>
              <strong>Mahasiswa</strong>
            </div>
            <div className="student-info-row">
              <span>Akses</span>
              <strong>Marketplace & Payment</strong>
            </div>
            <div className="student-info-row muted">
              <span>Dashboard Admin</span>
              <strong>Tidak aktif</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
