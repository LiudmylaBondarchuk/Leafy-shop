import { Leaf, Globe, Heart, Award } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">About Leafy</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
        <p className="text-lg leading-relaxed">
          Leafy was born from a simple belief: everyone deserves access to exceptional teas and coffees.
          We work directly with small farms and estates across Japan, China, India, Sri Lanka, Ethiopia,
          Colombia, and Brazil to bring you the finest loose-leaf teas and freshly roasted coffee beans.
        </p>

        <p>
          Every product in our collection is carefully selected, tested, and approved by our team of
          certified tea sommeliers and Q-graders. We visit our partner farms regularly to ensure the
          highest quality standards and fair working conditions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6">
          <div className="flex gap-4">
            <div className="bg-green-100 p-3 rounded-lg h-fit">
              <Globe className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Direct Sourcing</h3>
              <p className="text-sm">We source from 12+ countries, working directly with farmers to ensure fair prices and premium quality.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-green-100 p-3 rounded-lg h-fit">
              <Heart className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Sustainability</h3>
              <p className="text-sm">All our packaging is recyclable. We offset our carbon footprint and support reforestation projects.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-green-100 p-3 rounded-lg h-fit">
              <Award className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Quality First</h3>
              <p className="text-sm">Every batch is cupped and graded before it reaches our shelves. We never compromise on quality.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-green-100 p-3 rounded-lg h-fit">
              <Leaf className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Freshness Guaranteed</h3>
              <p className="text-sm">Teas and coffees are packed to order, ensuring maximum freshness when they arrive at your door.</p>
            </div>
          </div>
        </div>

        <p>
          We're not just a shop — we're a community of flavor enthusiasts. Whether you're a seasoned
          tea connoisseur or just beginning your coffee journey, we're here to help you discover
          something extraordinary.
        </p>
      </div>
    </div>
  );
}
