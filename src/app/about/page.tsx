import { Leaf, Globe, Heart, Award } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Story</h1>
      <p className="text-sm text-green-700 font-medium mb-8 tracking-wide uppercase">From leaf to cup — the Leafy way</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
        <p className="text-lg leading-relaxed">
          It started with a single cup of Darjeeling on a rainy afternoon and a thought that
          refused to leave: <em>why is it so hard to find truly great tea and coffee without
          paying boutique prices?</em> That question became Leafy — a direct bridge between
          the world&apos;s finest small-batch growers and your morning ritual.
        </p>

        <p>
          Today, we partner with over 30 family-owned farms and estates across Japan, China,
          India, Sri Lanka, Ethiopia, Colombia, and Brazil. No middlemen. No mass-market blends
          disguised as premium. Just honest, traceable leaves and beans — selected by our team
          of certified tea sommeliers and Q-grade coffee cuppers who taste every single batch
          before it earns a place on our shelves.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6">
          <div className="flex gap-4">
            <div className="bg-green-100 p-3 rounded-lg h-fit">
              <Globe className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Farm-Direct Sourcing</h3>
              <p className="text-sm">We buy straight from growers in 12+ countries — cutting out the middlemen so farmers earn more and you pay less for better quality.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-green-100 p-3 rounded-lg h-fit">
              <Heart className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Planet-Friendly by Design</h3>
              <p className="text-sm">Recyclable packaging, carbon-offset shipping, and partnerships with reforestation projects — because great flavor should never cost the earth.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-green-100 p-3 rounded-lg h-fit">
              <Award className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Obsessively Curated</h3>
              <p className="text-sm">Every batch is cupped, graded, and scored before it ships. If it does not meet our standards, it does not meet your cup. Simple as that.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-green-100 p-3 rounded-lg h-fit">
              <Leaf className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Packed When You Order</h3>
              <p className="text-sm">No warehouse shelves, no stale stock. Your tea and coffee are packed fresh the moment you click &quot;order&quot; — because freshness is flavor.</p>
            </div>
          </div>
        </div>

        <p>
          We built Leafy for the curious — the people who read the origin on the label, who
          notice the difference between a first flush and a second, who believe their Tuesday
          morning coffee deserves the same care as a Saturday afternoon pour-over. Whether you
          have been exploring specialty tea for decades or just discovered that coffee can taste
          like blueberries, you are in the right place.
        </p>

        <p className="text-green-800 font-medium">
          Welcome to Leafy. Your next favorite cup is already here.
        </p>
      </div>
    </div>
  );
}
