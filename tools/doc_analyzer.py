#!/usr/bin/env python3
"""
Trizetto Facets Documentation Analyzer
Extracts key information from Facets documentation to identify product opportunities.
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Any
import argparse

# Optional imports - install as needed
try:
    import PyPDF2
    import pdfplumber
    HAS_PDF_SUPPORT = True
except ImportError:
    HAS_PDF_SUPPORT = False

try:
    from docx import Document
    HAS_DOCX_SUPPORT = True
except ImportError:
    HAS_DOCX_SUPPORT = False


class FacetsDocAnalyzer:
    def __init__(self, output_dir: str = "docs/analysis"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.analysis_results = {
            'apis': [],
            'workflows': [],
            'integrations': [],
            'pain_points': [],
            'opportunities': []
        }
    
    def analyze_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """Analyze PDF documentation for key information."""
        if not HAS_PDF_SUPPORT:
            return {"error": "PDF support not installed. Run: pip install PyPDF2 pdfplumber"}
        
        results = {
            'file': pdf_path,
            'apis': [],
            'workflows': [],
            'data_models': [],
            'integration_points': []
        }
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() or ""
                
                # Extract API endpoints
                api_pattern = r'(?i)(?:api|endpoint|service).*?(?:\/[a-zA-Z0-9\/_-]+)'
                apis = re.findall(api_pattern, text)
                results['apis'] = list(set(apis))
                
                # Extract workflow descriptions
                workflow_pattern = r'(?i)(?:workflow|process|procedure):\s*([^\n.]+)'
                workflows = re.findall(workflow_pattern, text)
                results['workflows'] = workflows
                
                # Extract data models/entities
                model_pattern = r'(?i)(?:table|entity|object|model):\s*([a-zA-Z][a-zA-Z0-9_]+)'
                models = re.findall(model_pattern, text)
                results['data_models'] = list(set(models))
                
        except Exception as e:
            results['error'] = str(e)
        
        return results
    
    def analyze_text_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze text-based documentation."""
        results = {
            'file': file_path,
            'key_terms': [],
            'pain_points': [],
            'opportunities': []
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
                # Look for pain point indicators
                pain_indicators = [
                    'manual', 'manually', 'time-consuming', 'complex', 'difficult',
                    'workaround', 'limitation', 'issue', 'problem', 'challenge',
                    'slow', 'inefficient', 'error-prone'
                ]
                
                for indicator in pain_indicators:
                    pattern = rf'(?i)[^.]*{indicator}[^.]*\.'
                    matches = re.findall(pattern, content)
                    results['pain_points'].extend(matches)
                
                # Look for opportunity indicators
                opportunity_indicators = [
                    'integration', 'automation', 'streamline', 'optimize',
                    'enhance', 'improve', 'simplify', 'accelerate'
                ]
                
                for indicator in opportunity_indicators:
                    pattern = rf'(?i)[^.]*{indicator}[^.]*\.'
                    matches = re.findall(pattern, content)
                    results['opportunities'].extend(matches)
                
        except Exception as e:
            results['error'] = str(e)
        
        return results
    
    def extract_business_processes(self, content: str) -> List[str]:
        """Extract business process descriptions."""
        process_patterns = [
            r'(?i)claims? (?:processing|adjudication|workflow)',
            r'(?i)member (?:enrollment|eligibility|management)',
            r'(?i)provider (?:network|credentialing|management)',
            r'(?i)prior authorization',
            r'(?i)benefit (?:verification|administration)',
            r'(?i)payment (?:processing|posting)',
            r'(?i)reporting (?:and analytics|requirements)'
        ]
        
        processes = []
        for pattern in process_patterns:
            matches = re.findall(pattern, content)
            processes.extend(matches)
        
        return list(set(processes))
    
    def generate_opportunity_report(self) -> str:
        """Generate a report of identified opportunities."""
        report = [
            "# Trizetto Facets Product Opportunity Report",
            f"Generated: {Path().absolute()}",
            "",
            "## Identified APIs",
            *[f"- {api}" for api in self.analysis_results['apis']],
            "",
            "## Business Workflows",
            *[f"- {workflow}" for workflow in self.analysis_results['workflows']],
            "",
            "## Integration Opportunities",
            *[f"- {integration}" for integration in self.analysis_results['integrations']],
            "",
            "## Pain Points Identified",
            *[f"- {pain}" for pain in self.analysis_results['pain_points']],
            "",
            "## Product Opportunities",
            *[f"- {opp}" for opp in self.analysis_results['opportunities']],
            "",
            "## Recommended Next Steps",
            "1. Validate findings with Facets users/administrators",
            "2. Research competitive solutions in identified areas",
            "3. Prototype high-impact opportunities",
            "4. Conduct customer interviews for market validation"
        ]
        
        return "\n".join(report)
    
    def analyze_directory(self, directory: str) -> None:
        """Analyze all documentation files in a directory."""
        dir_path = Path(directory)
        
        if not dir_path.exists():
            print(f"Directory {directory} does not exist")
            return
        
        for file_path in dir_path.rglob('*'):
            if file_path.is_file():
                suffix = file_path.suffix.lower()
                
                if suffix == '.pdf' and HAS_PDF_SUPPORT:
                    result = self.analyze_pdf(str(file_path))
                    self.analysis_results['apis'].extend(result.get('apis', []))
                    self.analysis_results['workflows'].extend(result.get('workflows', []))
                
                elif suffix in ['.txt', '.md', '.rst']:
                    result = self.analyze_text_file(str(file_path))
                    self.analysis_results['pain_points'].extend(result.get('pain_points', []))
                    self.analysis_results['opportunities'].extend(result.get('opportunities', []))
        
        # Remove duplicates
        for key in self.analysis_results:
            self.analysis_results[key] = list(set(self.analysis_results[key]))
    
    def save_results(self) -> None:
        """Save analysis results to files."""
        # Save JSON results
        json_path = self.output_dir / 'analysis_results.json'
        with open(json_path, 'w') as f:
            json.dump(self.analysis_results, f, indent=2)
        
        # Save report
        report_path = self.output_dir / 'opportunity_report.md'
        with open(report_path, 'w') as f:
            f.write(self.generate_opportunity_report())
        
        print(f"Analysis complete. Results saved to {self.output_dir}")


def main():
    parser = argparse.ArgumentParser(description='Analyze Facets documentation for product opportunities')
    parser.add_argument('path', help='Path to documentation file or directory')
    parser.add_argument('--output', default='docs/analysis', help='Output directory for results')
    
    args = parser.parse_args()
    
    analyzer = FacetsDocAnalyzer(args.output)
    
    if Path(args.path).is_dir():
        print(f"Analyzing directory: {args.path}")
        analyzer.analyze_directory(args.path)
    else:
        print(f"Analyzing file: {args.path}")
        if args.path.endswith('.pdf'):
            result = analyzer.analyze_pdf(args.path)
        else:
            result = analyzer.analyze_text_file(args.path)
        print(json.dumps(result, indent=2))
    
    analyzer.save_results()


if __name__ == '__main__':
    main()