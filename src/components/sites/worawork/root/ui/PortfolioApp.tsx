"use client";

import { bio, experience, education, skills, artProjects } from "../data/content";
import { useWoraWorkStore, type PortfolioPageId } from "../store";

const NAV: { id: PortfolioPageId; label: string }[] = [
  { id: "about", label: "About Me" },
  { id: "experience", label: "Experience" },
  { id: "arts", label: "Art & Project" },
  { id: "behind-scenes", label: "Behind the Scenes" },
];

function AboutPage() {
  return (
    <div className="ww-portfolio-page ww-about-story">
      <section className="ww-section">
        <h2>Quick Bio</h2>
        <p>{bio.quick}</p>
      </section>
      <section className="ww-section">
        <h2>Full Bio</h2>
        {bio.full.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>
    </div>
  );
}

function SkillRow({ label, items }: { label: string; items: { name: string; src: string }[] }) {
  return (
    <div className="ww-row">
      <span className="ww-label">{label}</span>
      <div className="ww-icons">
        {items.map((item) => (
          <div className="ww-icon" title={item.name} key={item.name}>
            <img src={item.src} alt={item.name} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ExperiencePage() {
  return (
    <div className="ww-portfolio-page ww-experience-page">
      <section>
        <h2 className="ww-section-title">Experience</h2>
        {experience.map((item, i) => (
          <div className="ww-info-block" key={i}>
            <div className="ww-info-content">
              <h3>{item.title}</h3>
              <p className="ww-sub-info">
                {item.company} &nbsp;•&nbsp; {item.duration}
              </p>
              <ul>
                {item.details.map((d, j) => (
                  <li key={j}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>
      <section>
        <h2 className="ww-section-title">Education</h2>
        {education.map((item, i) => (
          <div className="ww-info-block" key={i}>
            <div className="ww-info-content">
              <h3>{item.school}</h3>
              <p className="ww-sub-info">
                {item.country} &nbsp;•&nbsp; {item.duration}
              </p>
              <ul>
                {item.details.map((d, j) => (
                  <li key={j}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>
      <div className="ww-portfolio-page ww-skills-icons">
        <h2 className="ww-min-title">Technical Skills</h2>
        <SkillRow label="3D" items={skills.threeD} />
        <SkillRow label="Engines" items={skills.engines} />
        <SkillRow label="Code" items={skills.code} />
      </div>
    </div>
  );
}

function ArtsPage() {
  return (
    <div className="ww-portfolio-page ww-arts-simple">
      <h2>Arts / Projects</h2>
      {artProjects.map((project, i) => (
        <div className="ww-art-block" key={i}>
          <a className="ww-art-block-title" href={project.link} target="_blank" rel="noopener noreferrer">
            {project.title}
          </a>
          <div className="ww-art-grid">
            {project.images.map((img, j) => (
              <div className="ww-art-item" key={j}>
                <a href={img.link} target="_blank" rel="noopener noreferrer">
                  <img src={img.src} alt={project.title} loading="lazy" />
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BehindScenesPage() {
  return (
    <div className="ww-portfolio-page">
      <h2>Behind the Scenes</h2>
      <p>Coming soon...</p>
    </div>
  );
}

export function portfolioUrlLabel(page: PortfolioPageId): string {
  return `worawork.dev/${page}`;
}

export function PortfolioApp() {
  const currentPage = useWoraWorkStore((s) => s.currentPage);
  const setCurrentPage = useWoraWorkStore((s) => s.setCurrentPage);

  const renderPage = () => {
    switch (currentPage) {
      case "about":
        return <AboutPage />;
      case "experience":
        return <ExperiencePage />;
      case "arts":
        return <ArtsPage />;
      case "behind-scenes":
        return <BehindScenesPage />;
    }
  };

  return (
    <>
      <nav className="ww-portfolio-nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`ww-nav-item ${currentPage === item.id ? "active" : ""}`}
            onClick={() => setCurrentPage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="ww-page-content" key={currentPage}>
        {renderPage()}
      </div>
    </>
  );
}
