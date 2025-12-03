'use client';

const Contribute = ({ setSelectedSection }) => {

  const handleSectionChange = (section) => {
    setSelectedSection(section);  // Update the selected section state in the parent component
  };

  // SEO metadata
  const pageTitle = "Contribute to Red Guardian - Support Community Safety";
  const pageDescription = "Help support Red Guardian's mission to improve community safety. Contribute to our ongoing development and help keep neighborhoods safer for everyone.";
  const canonicalUrl = "https://guardian.red/contribute";

  return (
    <>
    <head>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content="contribute, support, red guardian, community safety, donation, funding, help development" />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
    </head>
    <div className="contribute">
      <h1>Support Red Guardian</h1>
      <h3>Este es nuestro Vaki.</h3>
      <h2>Gracias!</h2>
      <iframe id="vakiIframe"
        title="Red Guardián"
        width="350"
        height="590"
        src="https://vaki.co/iframe/PC27hXlqDFL5JVpre4oY">
      </iframe>
    </div>
    </>
  )
}

export default Contribute;