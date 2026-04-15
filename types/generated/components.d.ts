import type { Schema, Struct } from '@strapi/strapi';

export interface AboutGalleryItem extends Struct.ComponentSchema {
  collectionName: 'components_about_gallery_items';
  info: {
    description: 'Facility image from Media Library';
    displayName: 'Gallery Item';
  };
  attributes: {
    alt: Schema.Attribute.String & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface AboutValueItem extends Struct.ComponentSchema {
  collectionName: 'components_about_value_items';
  info: {
    description: 'Why choose us card with Strapi media image';
    displayName: 'Value Item';
  };
  attributes: {
    alt: Schema.Attribute.String & Schema.Attribute.Required;
    desc: Schema.Attribute.Text & Schema.Attribute.Required;
    img: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HeroCtaButton extends Struct.ComponentSchema {
  collectionName: 'components_hero_cta_buttons';
  info: {
    description: 'Hero call-to-action button';
    displayName: 'CTA Button';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    variant: Schema.Attribute.Enumeration<['primary', 'secondary']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'primary'>;
  };
}

export interface PrivacySection extends Struct.ComponentSchema {
  collectionName: 'components_privacy_sections';
  info: {
    description: 'Privacy policy section block';
    displayName: 'Section';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ScreeningProcessStep extends Struct.ComponentSchema {
  collectionName: 'components_screening_process_steps';
  info: {
    description: 'Step row for screening process timeline';
    displayName: 'Process Step';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    details: Schema.Attribute.JSON;
    estimatedTime: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SeoEntry extends Struct.ComponentSchema {
  collectionName: 'components_seo_entries';
  info: {
    description: 'Meta tags, Open Graph / Twitter, image alt for social preview, JSON-LD, robots, AI/snippet text.';
    displayName: 'SEO & schema';
  };
  attributes: {
    canonicalPath: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaKeywords: Schema.Attribute.String;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    noIndex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    openGraphImage: Schema.Attribute.Media<'images'>;
    openGraphImageAlt: Schema.Attribute.String;
    snippetForAiOverview: Schema.Attribute.Text;
    structuredData: Schema.Attribute.JSON;
    twitterCard: Schema.Attribute.Enumeration<
      ['summary', 'summary_large_image']
    > &
      Schema.Attribute.DefaultTo<'summary_large_image'>;
  };
}

export interface ServiceDocumentItem extends Struct.ComponentSchema {
  collectionName: 'components_service_document_items';
  info: {
    description: 'Required document for a service';
    displayName: 'Document Item';
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    required: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
  };
}

export interface ServicePricingRow extends Struct.ComponentSchema {
  collectionName: 'components_service_pricing_rows';
  info: {
    description: 'Service pricing line: item, price, duration';
    displayName: 'Pricing Row';
  };
  attributes: {
    duration: Schema.Attribute.String & Schema.Attribute.Required;
    item: Schema.Attribute.String & Schema.Attribute.Required;
    price: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ServiceSimpleLine extends Struct.ComponentSchema {
  collectionName: 'components_service_simple_lines';
  info: {
    description: 'One line for Benefits or Tests \u2014 use Add an entry for each bullet.';
    displayName: 'List item';
  };
  attributes: {
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ServiceTimelineStep extends Struct.ComponentSchema {
  collectionName: 'components_service_timeline_steps';
  info: {
    description: 'Process step for service detail page';
    displayName: 'Timeline Step';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    step: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ServicesComparisonRow extends Struct.ComponentSchema {
  collectionName: 'components_services_comparison_rows';
  info: {
    description: 'Single feature row for Services comparison table';
    displayName: 'Comparison Row';
  };
  attributes: {
    feature: Schema.Attribute.String & Schema.Attribute.Required;
    laboratory: Schema.Attribute.String & Schema.Attribute.Required;
    physical: Schema.Attribute.String & Schema.Attribute.Required;
    radiology: Schema.Attribute.String & Schema.Attribute.Required;
    vaccination: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'about.gallery-item': AboutGalleryItem;
      'about.value-item': AboutValueItem;
      'hero.cta-button': HeroCtaButton;
      'privacy.section': PrivacySection;
      'screening.process-step': ScreeningProcessStep;
      'seo.entry': SeoEntry;
      'service.document-item': ServiceDocumentItem;
      'service.pricing-row': ServicePricingRow;
      'service.simple-line': ServiceSimpleLine;
      'service.timeline-step': ServiceTimelineStep;
      'services.comparison-row': ServicesComparisonRow;
    }
  }
}
