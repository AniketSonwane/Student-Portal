import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { APP_CONFIG } from '../../utils/constants';

export const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 py-4 sm:py-8 pb-24 sm:pb-8 px-3 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        {/* Header navigation */}
        <div className="flex items-center justify-between mb-5 sm:mb-8 pb-3.5 border-b border-slate-200 dark:border-[#222228]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="px-2.5 sm:px-3 text-xs"
          >
            Back
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px] sm:max-w-none">
              {APP_CONFIG.name}
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white/95 dark:bg-[#0A0A0E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-5 sm:p-10 space-y-7 sm:space-y-8 relative overflow-hidden">
          {/* Accent bar at top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8048A8] to-[#F8D299] opacity-75" />

          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Terms and Conditions
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Last Updated: September 27, 2026
            </p>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Welcome to our Student Portal. By accessing or using this website, you agree to the following Terms and Conditions. Please read them carefully before using the website.
            </p>
          </div>

          <div className="space-y-6 sm:space-y-7 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {/* 1 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                1. Unofficial and Independent Platform
              </h2>
              <p>
                This website is an <strong className="text-slate-800 dark:text-slate-100">independently created and unofficial student portal</strong>.
              </p>
              <p>
                The website is <strong className="text-slate-800 dark:text-slate-100">not affiliated with, owned by, operated by, endorsed by, or officially connected with any school, college, university, educational institution, government organization, examination authority, board, or other official organization unless explicitly stated otherwise.</strong>
              </p>
              <p>
                Nothing on this website should be considered an official communication, notification, record, document, result, certificate, notice, or announcement from any institution or authority.
              </p>
            </div>

            {/* 2 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                2. Source of Student Data
              </h2>
              <p>
                Any student-related information displayed on this website <strong className="text-slate-800 dark:text-slate-100">is not obtained from official institutional sources</strong> unless specifically mentioned.
              </p>
              <p>The information may have been:</p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600 dark:text-slate-300">
                <li>Collected personally.</li>
                <li>Provided mutually by students or users.</li>
                <li>Entered or maintained by the website administrators.</li>
                <li>Compiled from publicly available information.</li>
                <li>Based on assumptions or estimates.</li>
                <li>Created for demonstration or learning purposes.</li>
                <li>Created or modified for website management and organization.</li>
                <li>Added as sample, placeholder, or illustrative information.</li>
              </ul>
              <p>
                Therefore, the information displayed on this website <strong className="text-slate-800 dark:text-slate-100">may not be accurate, complete, current, or officially verified</strong>.
              </p>
            </div>

            {/* 3 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                3. No Official Status
              </h2>
              <p>
                <strong className="text-slate-800 dark:text-slate-100">Nothing on this website should be treated as official.</strong>
              </p>
              <p>This includes, but is not limited to:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 list-disc list-inside pl-1 text-slate-600 dark:text-slate-300">
                <li>Student information</li>
                <li>Student records</li>
                <li>Attendance</li>
                <li>Marks or grades</li>
                <li>Examination information</li>
                <li>Results</li>
                <li>Class information</li>
                <li>Timetables</li>
                <li>Notices</li>
                <li>Assignments</li>
                <li>Announcements</li>
                <li>Rankings</li>
                <li>Academic information</li>
                <li>Personal information</li>
                <li className="sm:col-span-2">Any other information displayed on the website</li>
              </ul>
              <p className="pt-1">
                Users should verify important information directly with the relevant official institution or authority.
              </p>
            </div>

            {/* 4 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                4. Purpose of the Website
              </h2>
              <p>The website is created primarily for:</p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600 dark:text-slate-300">
                <li>Learning and educational purposes.</li>
                <li>Practicing web development and software development.</li>
                <li>Student information management.</li>
                <li>Personal organization and record keeping.</li>
                <li>Demonstration and experimentation.</li>
                <li>Maintaining information in a convenient format.</li>
              </ul>
              <p>
                The website does not claim to replace any official student portal, institutional system, examination portal, or government website.
              </p>
            </div>

            {/* 5 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                5. Accuracy of Information
              </h2>
              <p>Although reasonable efforts may be made to maintain the information, we do not guarantee that any information on the website is:</p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600 dark:text-slate-300">
                <li>Accurate.</li>
                <li>Complete.</li>
                <li>Correct.</li>
                <li>Current.</li>
                <li>Officially verified.</li>
                <li>Suitable for making academic or administrative decisions.</li>
              </ul>
              <p>
                Users are responsible for independently verifying important information through the appropriate official source.
              </p>
            </div>

            {/* 6 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                6. User Responsibility
              </h2>
              <p>
                Users should not rely solely on information displayed on this website for important academic, administrative, financial, examination, admission, or other official decisions.
              </p>
              <p>
                For official information, users should contact their relevant institution or visit the institution&apos;s official website or authorized portal.
              </p>
            </div>

            {/* 7 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                7. Personal and Student Information
              </h2>
              <p>
                Users should avoid submitting sensitive or unnecessary personal information to the website.
              </p>
              <p>
                Where student information is maintained on the website, it is intended for the specific purposes for which the portal has been created. Users should not misuse, copy, distribute, modify, or disclose another person&apos;s information without appropriate permission.
              </p>
            </div>

            {/* 8 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                8. No Guarantee
              </h2>
              <p>
                The website and its information are provided on an <strong className="text-slate-800 dark:text-slate-100">&quot;as is&quot; and &quot;as available&quot;</strong> basis.
              </p>
              <p>
                We do not guarantee uninterrupted availability, accuracy, reliability, completeness, or suitability of the website or its information.
              </p>
            </div>

            {/* 9 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                9. Changes to Information
              </h2>
              <p>
                The information on the website may be changed, updated, removed, corrected, or modified at any time without prior notice.
              </p>
              <p>
                We may also change the website&apos;s features, design, functionality, or content at any time.
              </p>
            </div>

            {/* 10 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                10. External Links
              </h2>
              <p>
                The website may contain links to external websites or services.
              </p>
              <p>
                We are not responsible for the content, accuracy, availability, privacy practices, or policies of external websites. Users should review the terms and privacy policies of external websites before using them.
              </p>
            </div>

            {/* 11 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                11. Prohibited Use
              </h2>
              <p>Users must not use the website to:</p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600 dark:text-slate-300">
                <li>Misrepresent information as official.</li>
                <li>Impersonate an educational institution or authority.</li>
                <li>Misuse another person&apos;s information.</li>
                <li>Commit fraud or deception.</li>
                <li>Attempt to gain unauthorized access.</li>
                <li>Damage or disrupt the website.</li>
                <li>Use the website for unlawful purposes.</li>
              </ul>
            </div>

            {/* 12 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                12. Intellectual Property
              </h2>
              <p>
                Unless otherwise stated, the website&apos;s original design, code, content, graphics, and other materials may be protected by applicable intellectual property laws.
              </p>
              <p>
                Third-party names, logos, trademarks, or other materials belong to their respective owners and do not imply any affiliation or endorsement.
              </p>
            </div>

            {/* 13 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                13. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable law, the website owner or administrators shall not be responsible for any loss, damage, misunderstanding, academic decision, administrative decision, or other consequence resulting from reliance on information provided on this website.
              </p>
              <p>
                Users are responsible for verifying information before relying upon it.
              </p>
            </div>

            {/* 14 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                14. Acceptance of These Terms
              </h2>
              <p>By using this website, you acknowledge that:</p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600 dark:text-slate-300">
                <li>This is an independent and unofficial platform.</li>
                <li>The information displayed may not come from official sources.</li>
                <li>Student data may be personally collected, mutually provided, assumed, estimated, or created for learning and management purposes.</li>
                <li>Information displayed on the website should not be considered official unless explicitly identified as such.</li>
                <li>Important information should be verified through appropriate official sources.</li>
              </ul>
              <p className="pt-1">
                If you do not agree with these Terms and Conditions, please do not use the website.
              </p>
            </div>

            {/* 15 */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                15. Contact
              </h2>
              <p>
                If you have questions, concerns, or requests regarding these Terms and Conditions or information displayed on the website, please contact the website administrator through the contact information provided on the website or via{' '}
                <a
                  href={APP_CONFIG.adminContactUrl}
                  className="font-medium text-[#8048A8] dark:text-[#D1A7FF] hover:underline"
                >
                  {APP_CONFIG.adminEmail}
                </a>
                .
              </p>
            </div>

            {/* Important Notice Callout */}
            <div className="mt-8 p-4 sm:p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-bold text-sm tracking-tight text-amber-950 dark:text-amber-100">
                    Important Notice
                  </p>
                  <p className="text-xs sm:text-sm leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                    This website is independently created and is not an official source of student or institutional information. All information is personally collected, mutually provided, assumed, estimated, or created for learning, demonstration, organization, and management purposes. Nothing on this website should be considered official unless explicitly stated and verified through an authorized official source.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
